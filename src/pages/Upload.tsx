import { useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Upload as UploadIcon, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  X,
  FileWarning
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface DailyData {
  date: string;
  revenue: number;
  target: number;
  occupancy: number;
  arr: number;
}

interface RoomTypeData {
  name: string;
  totalRooms: number;
  roomsSold: number;
  revenue: number;
  avgRate: number;
}

interface AnnualData {
  year: number;
  roomsSold: number;
  occupancy: number;
  revenue: number;
  avgRate: number;
}

interface ParsedData {
  daily: DailyData[];
  roomTypes: RoomTypeData[];
  annual: AnnualData[];
}

interface UploadState {
  status: 'idle' | 'dragging' | 'validating' | 'preview' | 'uploading' | 'success' | 'error';
  file: File | null;
  error: string | null;
  parsedData: ParsedData | null;
  recordsImported: number;
}

export default function Upload() {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    file: null,
    error: null,
    parsedData: null,
    recordsImported: 0,
  });
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, status: 'dragging' }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, status: 'idle' }));
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV.',
      }));
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'File too large. Maximum file size is 10MB.',
      }));
      return false;
    }
    
    return true;
  };

  const parseExcelDate = (serial: number): string => {
    // Excel dates start from Jan 1, 1900
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  };

  const parseExcelFile = async (file: File): Promise<ParsedData> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const parsed: ParsedData = {
      daily: [],
      roomTypes: [],
      annual: [],
    };

    // Parse Sheet 1 - Daily Data
    const dailySheet = workbook.Sheets[workbook.SheetNames[0]];
    if (dailySheet) {
      const dailyRows = XLSX.utils.sheet_to_json<any>(dailySheet);
      parsed.daily = dailyRows.map(row => ({
        date: typeof row.Date === 'number' ? parseExcelDate(row.Date) : row.Date,
        revenue: Number(row.Revenue) || 0,
        target: Number(row.Target) || 0,
        occupancy: Number(row.Occupancy) || 0,
        arr: Number(row.ARR) || 0,
      }));
    }

    // Parse Sheet 2 - Room Types
    const roomSheet = workbook.Sheets[workbook.SheetNames[1]];
    if (roomSheet) {
      const roomRows = XLSX.utils.sheet_to_json<any>(roomSheet);
      parsed.roomTypes = roomRows.map(row => ({
        name: row.Type || '',
        totalRooms: Number(row.Rooms) || 0,
        roomsSold: Number(row.Sold) || 0,
        revenue: Number(row.Revenue) || 0,
        avgRate: Number(row.Rate) || 0,
      }));
    }

    // Parse Sheet 3 - Historical/Annual
    const annualSheet = workbook.Sheets[workbook.SheetNames[2]];
    if (annualSheet) {
      const annualRows = XLSX.utils.sheet_to_json<any>(annualSheet);
      parsed.annual = annualRows.map(row => {
        const occupancyVal = row.Occupancy;
        let occupancy = 0;
        if (typeof occupancyVal === 'string' && occupancyVal.includes('%')) {
          occupancy = parseFloat(occupancyVal) / 100;
        } else {
          occupancy = Number(occupancyVal) || 0;
        }
        return {
          year: Number(row.Year) || 0,
          roomsSold: Number(row.RoomsSold) || 0,
          occupancy,
          revenue: Number(row.Revenue) || 0,
          avgRate: Number(row.Rate) || 0,
        };
      });
    }

    return parsed;
  };

  const processFile = async (file: File) => {
    setState(prev => ({ ...prev, status: 'validating', file }));
    
    if (!validateFile(file)) return;
    
    try {
      const parsedData = await parseExcelFile(file);
      setState(prev => ({
        ...prev,
        status: 'preview',
        parsedData,
      }));
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to parse Excel file. Please check the format matches the expected structure.',
      }));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleConfirmUpload = async () => {
    setState(prev => ({ ...prev, status: 'uploading' }));
    
    if (!state.parsedData) {
      setState(prev => ({ ...prev, status: 'error', error: 'No data to import' }));
      return;
    }

    try {
      let totalRecords = 0;

      // Import daily revenue data (aggregate records with room_type_id = null)
      if (state.parsedData.daily.length > 0) {
        // Delete existing aggregate records for these dates then re-insert
        const dates = state.parsedData.daily.map(d => d.date);
        await supabase
          .from('daily_revenue')
          .delete()
          .is('room_type_id', null)
          .in('date', dates);

        const dailyRecords = state.parsedData.daily.map(d => ({
          date: d.date,
          revenue: d.revenue,
          rooms_sold: Math.round(d.occupancy * 60),
          average_rate: d.arr,
          occupancy: d.occupancy,
        }));
        
        const { error: dailyError } = await supabase
          .from('daily_revenue')
          .insert(dailyRecords);
        
        if (dailyError) throw dailyError;
        totalRecords += dailyRecords.length;
      }

      // Import room types data (skip entries with empty names)
      const validRoomTypes = state.parsedData.roomTypes.filter(rt => rt.name && rt.name.trim() !== '');
      if (validRoomTypes.length > 0) {
        for (const rt of validRoomTypes) {
          const { error: roomError } = await supabase
            .from('room_types')
            .upsert({
              name: rt.name,
              total_rooms: rt.totalRooms,
              breakeven_rate: rt.avgRate * 0.6,
            }, { onConflict: 'name' });
          
          if (roomError) throw roomError;
        }
        totalRecords += validRoomTypes.length;

        // Now fetch room type IDs and insert per-room-type revenue records
        const { data: roomTypesFromDb } = await supabase
          .from('room_types')
          .select('id, name');
        
        if (roomTypesFromDb && state.parsedData.daily.length > 0) {
          const roomTypeMap = new Map(roomTypesFromDb.map(rt => [rt.name, rt.id]));
          
          // Determine the month from daily data (use first record's date)
          const firstDate = state.parsedData.daily[0].date;
          const monthStart = firstDate.substring(0, 8) + '01'; // YYYY-MM-01
          
          // Create one summary record per room type for this month
          const roomTypeRecords = validRoomTypes
            .filter(rt => roomTypeMap.has(rt.name))
            .map(rt => ({
              date: monthStart,
              room_type_id: roomTypeMap.get(rt.name)!,
              revenue: rt.revenue,
              rooms_sold: rt.roomsSold,
              average_rate: rt.avgRate,
              occupancy: rt.totalRooms > 0 ? rt.roomsSold / (rt.totalRooms * 30) : 0,
            }));
          
          if (roomTypeRecords.length > 0) {
            const { error: rtRevenueError } = await supabase
              .from('daily_revenue')
              .upsert(roomTypeRecords, { onConflict: 'date,room_type_id' });
            
            if (rtRevenueError) throw rtRevenueError;
            totalRecords += roomTypeRecords.length;
          }
        }
      }

      // Import annual summary data
      if (state.parsedData.annual.length > 0) {
        const annualRecords = state.parsedData.annual.map(a => ({
          year: a.year,
          total_rooms_sold: a.roomsSold,
          occupancy_percentage: a.occupancy * 100,
          total_revenue: a.revenue,
          average_rate: a.avgRate,
        }));
        
        const { error: annualError } = await supabase
          .from('annual_summary')
          .upsert(annualRecords, { onConflict: 'year' });
        
        if (annualError) throw annualError;
        totalRecords += annualRecords.length;
      }

      // Record the upload
      const { error: uploadError } = await supabase.from('data_uploads').insert({
        filename: state.file?.name || 'unknown',
        records_imported: totalRecords,
        status: 'completed',
      });
      
      if (uploadError) throw uploadError;
      
      setState(prev => ({
        ...prev,
        status: 'success',
        recordsImported: totalRecords,
      }));
      
      toast({
        title: 'Upload Successful',
        description: `${totalRecords} records imported successfully.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to upload data. Please try again.',
      }));
    }
  };

  const handleReset = () => {
    setState({
      status: 'idle',
      file: null,
      error: null,
      parsedData: null,
      recordsImported: 0,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Page title */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Upload Data</h2>
          <p className="text-muted-foreground">Import revenue data from your Excel spreadsheet</p>
        </div>

        {/* Success State */}
        {state.status === 'success' && (
          <Alert className="border-success bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <AlertTitle className="text-success">Upload Complete</AlertTitle>
            <AlertDescription>
              Successfully imported {state.recordsImported} records from {state.file?.name}.
              The dashboard will now reflect the updated data.
            </AlertDescription>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
              Upload Another File
            </Button>
          </Alert>
        )}

        {/* Error State */}
        {state.status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Upload Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
              Try Again
            </Button>
          </Alert>
        )}

        {/* Upload Zone */}
        {(state.status === 'idle' || state.status === 'dragging' || state.status === 'validating') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Upload Excel File
              </CardTitle>
              <CardDescription>
                Drag and drop your revenue spreadsheet or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer',
                  state.status === 'dragging' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-4">
                    {state.status === 'validating' ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                          <FileSpreadsheet className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-muted-foreground">Validating file...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                          <UploadIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            Drop your file here or click to upload
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Supports .xlsx, .xls, and .csv files (max 10MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Format Guide */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <div className="flex items-start gap-2">
                  <FileWarning className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Expected Format</p>
                    <p className="text-muted-foreground mt-1">
                      Your spreadsheet should have 3 sheets: Daily Data (Date, Revenue, Target, Occupancy, ARR), 
                      Room Types (Type, Rooms, Sold, Revenue, Rate), and Historical (Year, RoomsSold, Occupancy, Revenue, Rate).
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview State */}
        {state.status === 'preview' && state.parsedData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    File Validated
                  </CardTitle>
                  <CardDescription>
                    {state.file?.name} • {state.parsedData.daily.length} daily records, {state.parsedData.roomTypes.length} room types, {state.parsedData.annual.length} annual records
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Daily Data Preview */}
              {state.parsedData.daily.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Daily Revenue (first 5 rows)</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left py-2 px-3 font-medium">Date</th>
                          <th className="text-right py-2 px-3 font-medium">Revenue</th>
                          <th className="text-right py-2 px-3 font-medium">Target</th>
                          <th className="text-right py-2 px-3 font-medium">Occupancy</th>
                          <th className="text-right py-2 px-3 font-medium">ARR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.parsedData.daily.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{row.date}</td>
                            <td className="py-2 px-3 text-right">R{row.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="py-2 px-3 text-right">R{row.target.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="py-2 px-3 text-right">{(row.occupancy * 100).toFixed(1)}%</td>
                            <td className="py-2 px-3 text-right">R{row.arr.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Room Types Preview */}
              {state.parsedData.roomTypes.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Room Types</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left py-2 px-3 font-medium">Type</th>
                          <th className="text-right py-2 px-3 font-medium">Rooms</th>
                          <th className="text-right py-2 px-3 font-medium">Sold</th>
                          <th className="text-right py-2 px-3 font-medium">Revenue</th>
                          <th className="text-right py-2 px-3 font-medium">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.parsedData.roomTypes.map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{row.name}</td>
                            <td className="py-2 px-3 text-right">{row.totalRooms}</td>
                            <td className="py-2 px-3 text-right">{row.roomsSold}</td>
                            <td className="py-2 px-3 text-right">R{row.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="py-2 px-3 text-right">R{row.avgRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Annual Summary Preview */}
              {state.parsedData.annual.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Annual Summary</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left py-2 px-3 font-medium">Year</th>
                          <th className="text-right py-2 px-3 font-medium">Rooms Sold</th>
                          <th className="text-right py-2 px-3 font-medium">Occupancy</th>
                          <th className="text-right py-2 px-3 font-medium">Revenue</th>
                          <th className="text-right py-2 px-3 font-medium">Avg Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.parsedData.annual.map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{row.year}</td>
                            <td className="py-2 px-3 text-right">{row.roomsSold.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right">{(row.occupancy * 100).toFixed(0)}%</td>
                            <td className="py-2 px-3 text-right">R{row.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="py-2 px-3 text-right">R{row.avgRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button onClick={handleConfirmUpload} className="gap-2">
                  <UploadIcon className="w-4 h-4" />
                  Confirm & Import
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Uploading State */}
        {state.status === 'uploading' && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <UploadIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Importing data...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please wait while we process your file
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}