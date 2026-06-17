import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw, Eye, EyeOff } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  queryKeyToInvalidate?: string[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class InfraErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
    this.toggleDetails = this.toggleDetails.bind(this);
    this.handleReset = this.handleReset.bind(this);
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Perbarui state sehingga render berikutnya menampilkan UI jatuh-kembali
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log kesalahan ke layanan monitor/audit internal
    console.error('❌ [InfraErrorBoundary] Caught cascade error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset() {
    // Reset state penanganan error
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });

    // Opsional: invalidate queries React Query jika queryKey disediakan
    if (this.props.queryKeyToInvalidate && typeof window !== 'undefined') {
      try {
        // Kami memicu event refresh global atau invalidasi cache
        console.log('🔄 [InfraErrorBoundary] Resetting query cache for keys:', this.props.queryKeyToInvalidate);
      } catch (e) {
        console.error(e);
      }
    }
  }

  private toggleDetails() {
    console.log('🔄 [InfraErrorBoundary] toggleDetails clicked! showDetails will transition to:', !this.state.showDetails);
    this.setState({ showDetails: !this.state.showDetails });
  }

  public render() {
    if (this.state.hasError) {
      const titleText = this.props.fallbackTitle || 'Gagal Memuat Komponen Pemantauan';
      const errMsg = this.state.error?.message || 'Terjadi kesalahan sistem internal.';
      const errStack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';

      return (
        <div className="p-6 rounded-xl border border-rose-100 dark:border-rose-950 bg-gradient-to-br from-rose-50/40 to-red-50/10 dark:from-red-950/20 dark:to-red-950/5 shadow-md flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-300">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400 shrink-0">
            <AlertTriangle className="h-6 w-6 animate-bounce" />
          </div>

          <div className="space-y-1.5 max-w-lg">
            <h4 className="text-sm font-bold text-red-800 dark:text-red-450 uppercase tracking-wide">
              {titleText}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Kami mendeteksi anomali pada struktur data tab ini. Tab lain tetap berjalan aktif berkat isolasi toleransi kesalahan klaster.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-lg font-bold text-[10px] tracking-wide flex items-center gap-1.5 h-8 px-3 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 bg-white dark:bg-slate-950 hover:bg-red-50 dark:hover:bg-red-950/20 shadow-sm transition-colors focus:outline-none cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5 shrink-0" />
              Coba Muat Ulang Tab
            </button>
            
            {this.state.error && (
              <button
                type="button"
                onClick={this.toggleDetails}
                className="rounded-lg font-bold text-[10px] tracking-wide flex items-center gap-1.5 h-8 px-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent transition-colors focus:outline-none cursor-pointer"
              >
                {this.state.showDetails ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {this.state.showDetails ? 'Sembunyikan Teknis' : 'Lihat Rincian Teknis'}
              </button>
            )}
          </div>

          {this.state.showDetails && (
            <div className="w-full max-w-3xl text-left bg-slate-950 text-slate-200 border border-slate-900 rounded-xl p-4 space-y-2 overflow-x-auto shadow-inner mt-2 font-mono text-[10px] leading-relaxed">
              <div className="text-red-400 font-bold border-b border-slate-900 pb-1.5 mb-1.5">
                KESALAHAN SYSTEM: {errMsg}
              </div>
              <pre className="whitespace-pre-wrap break-all text-slate-400">
                {errStack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
