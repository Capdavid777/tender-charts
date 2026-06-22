import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CheckResult {
  label: string;
  description: string;
  pass: boolean;
  expected?: string[];
  found: string[];
}

interface VerifyResponse {
  domain: string;
  checkedAt: string;
  overall: 'verified' | 'incomplete';
  checks: {
    ns: CheckResult;
    mx: CheckResult;
    spf: CheckResult;
  };
}

const DEFAULT_DOMAIN = 'notify.reservedsuites.com';

export default function EmailDomainStatus() {
  const [domain, setDomain] = useState(DEFAULT_DOMAIN);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-email-domain', {
        body: null,
        method: 'GET' as never,
        // pass via query string by appending to function URL is not supported; use body POST instead
      });
      // Fallback: invoke with body so the function can read JSON, but our function reads query params.
      // Use direct fetch instead for query-string support.
      void data;
      void fnError;

      const supabaseUrl = (import.meta as { env: { VITE_SUPABASE_URL: string } }).env.VITE_SUPABASE_URL;
      const anonKey = (import.meta as { env: { VITE_SUPABASE_PUBLISHABLE_KEY: string } }).env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/verify-email-domain?domain=${encodeURIComponent(domain.trim())}`,
        { headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey } },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Check failed (${res.status})`);
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Email Sending Domain Status
        </CardTitle>
        <CardDescription>
          Verify NS delegation, MX, and SPF records for your sending subdomain. These power
          notification emails sent from the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="email-domain">Sending subdomain</Label>
            <Input
              id="email-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="notify.example.com"
            />
          </div>
          <Button onClick={runCheck} disabled={loading || !domain.trim()} className="gap-2">
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            {loading ? 'Checking…' : 'Run check'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Could not verify</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Overall status</p>
                <p className="text-xs text-muted-foreground">
                  Last checked {new Date(result.checkedAt).toLocaleString()}
                </p>
              </div>
              {result.overall === 'verified' ? (
                <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Incomplete
                </Badge>
              )}
            </div>

            {(['ns', 'mx', 'spf'] as const).map((key) => {
              const c = result.checks[key];
              return (
                <div key={key} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    </div>
                    {c.pass ? (
                      <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Fail
                      </Badge>
                    )}
                  </div>
                  {c.expected && c.expected.length > 0 && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Expected: </span>
                      <code className="text-foreground">{c.expected.join(', ')}</code>
                    </div>
                  )}
                  <div className="text-xs">
                    <span className="text-muted-foreground">Found: </span>
                    {c.found.length === 0 ? (
                      <span className="text-foreground">—</span>
                    ) : (
                      <code className="text-foreground break-all">{c.found.join(' | ')}</code>
                    )}
                  </div>
                </div>
              );
            })}

            {result.overall !== 'verified' && (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Next steps</AlertTitle>
                <AlertDescription className="text-xs">
                  At your DNS provider, ensure the subdomain has NS records pointing to
                  {' '}<code>ns3.lovable.cloud</code> and <code>ns4.lovable.cloud</code>. MX and SPF
                  are managed automatically inside the delegated zone — they will appear once NS
                  delegation has propagated (can take up to 72 hours).
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
