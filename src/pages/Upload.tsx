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

interface UploadState {
  status: 'idle' | 'dragging' | 'validating' | 'preview' | 'uploading' | 'success' | 'error';
  file: File | null;
  error: string | null;
  previewData: any[] | null;
  recordsImported: number;
}

export default function Upload() {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    file: null,
    error: null,
    previewData: null,
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

  const processFile = async (file: File) => {
    setState(prev => ({ ...prev, status: 'validating', file }));
    
    if (!validateFile(file)) return;
    
    // Simulate file parsing preview
    // In real implementation, this would parse the Excel file
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        status: 'preview',
        previewData: [
          { date: '2025-02-01', roomType: 'Deluxe 1 Bedroom', roomsSold: 6, revenue: 9900, avgRate: 1650 },
          { date: '2025-02-01', roomType: 'Standard 1 Bedroom', roomsSold: 4, revenue: 5400, avgRate: 1350 },
          { date: '2025-02-01', roomType: 'Studio', roomsSold: 3, revenue: 2850, avgRate: 950 },
          { date: '2025-02-02', roomType: 'Deluxe 1 Bedroom', roomsSold: 7, revenue: 11550, avgRate: 1650 },
          { date: '2025-02-02', roomType: 'Penthouse', roomsSold: 1, revenue: 2800, avgRate: 2800 },
        ],
      }));
    }, 1000);
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
    
    try {
      // Record the upload in database
      const { error } = await supabase.from('data_uploads').insert({
        filename: state.file?.name || 'unknown',
        records_imported: state.previewData?.length || 0,
        status: 'completed',
      });
      
      if (error) throw error;
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setState(prev => ({
        ...prev,
        status: 'success',
        recordsImported: state.previewData?.length || 0,
      }));
      
      toast({
        title: 'Upload Successful',
        description: `${state.previewData?.length || 0} records imported successfully.`,
      });
    } catch (error) {
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
      previewData: null,
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
                      Your spreadsheet should include columns for: Date, Room Type, Rooms Sold, Revenue, and Average Rate.
                      The first row should contain column headers.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview State */}
        {state.status === 'preview' && state.previewData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    File Validated
                  </CardTitle>
                  <CardDescription>
                    {state.file?.name} • {state.previewData.length} records found
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Preview of first {Math.min(5, state.previewData.length)} records:
              </p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left py-2 px-3 font-medium">Date</th>
                      <th className="text-left py-2 px-3 font-medium">Room Type</th>
                      <th className="text-right py-2 px-3 font-medium">Rooms Sold</th>
                      <th className="text-right py-2 px-3 font-medium">Revenue</th>
                      <th className="text-right py-2 px-3 font-medium">Avg Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.previewData.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2 px-3">{row.date}</td>
                        <td className="py-2 px-3">{row.roomType}</td>
                        <td className="py-2 px-3 text-right">{row.roomsSold}</td>
                        <td className="py-2 px-3 text-right">R{row.revenue.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">R{row.avgRate.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex gap-3 mt-6">
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