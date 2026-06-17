import React, { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Input, Button } from '@/components/ui';
import { confirmPasswordReset } from '@/api/auth.api';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, Key, X } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function ResetPasswordConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => String(params.get('token') || '').trim(), [params]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = token && newPassword.length >= 8 && newPassword === confirmPassword && !loading;

  const handleSubmit = async () => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await confirmPasswordReset(token, newPassword);
      setSuccessMsg(res.message || 'Password Anda telah berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Tautan pemulihan mungkin sudah kedaluwarsa atau tidak valid. Silakan ajukan permintaan baru.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-100">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center p-6 pt-14 pb-14 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-mesh rounded-full blur-3xl" />
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md relative z-10"
        >
          <Card className="rounded-3xl overflow-hidden border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
             <div className="p-6 sm:p-10">
                <AnimatePresence mode="wait">
                   {!successMsg ? (
                     <motion.div 
                       key="form"
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                     >
                        <div className="flex justify-center mb-6">
                           <div className="w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center border border-blue-100 dark:border-blue-800 shadow-sm shadow-blue-200/50">
                              <Key className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                           </div>
                        </div>

                        <h1 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2 tracking-tight">Atur Ulang Sandi</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-center mb-6 text-sm font-medium leading-relaxed">
                           Silakan masukkan kata sandi baru yang kuat untuk mengamankan akun Anda.
                        </p>

                        <div className="space-y-6">
                            <Input 
                               label="Kata Sandi Baru"
                               type="password"
                               size="auth"
                               leftIcon={<Lock />}
                               placeholder="Minimal 8 karakter"
                               value={newPassword}
                               onChange={(e) => setNewPassword(e.target.value)}
                            />

                            <Input 
                               label="Konfirmasi Sandi"
                               type="password"
                               size="auth"
                               leftIcon={<ShieldCheck />}
                               placeholder="Ulangi kata sandi"
                               value={confirmPassword}
                               onChange={(e) => setConfirmPassword(e.target.value)}
                               errorText={newPassword && confirmPassword && newPassword !== confirmPassword ? 'Kata sandi tidak cocok' : undefined}
                            />

                            <AnimatePresence>
                              {errorMsg && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }} 
                                  animate={{ opacity: 1, scale: 1 }} 
                                  className="flex gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30"
                                >
                                   <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                   <p className="text-sm font-bold text-red-700 dark:text-red-400">{errorMsg}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <Button 
                               variant="auth"
                               size="auth"
                               isLoading={loading}
                               disabled={!canSubmit}
                               onClick={handleSubmit}
                            >
                               Perbarui Kata Sandi <ArrowRight className="w-5 h-5" />
                            </Button>

                            <button 
                              onClick={() => navigate('/login')} 
                              className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors pt-2 group"
                            >
                               <X className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Batalkan & Kembali ke Login
                            </button>
                        </div>
                     </motion.div>
                   ) : (
                     <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                     >
                        <div className="flex justify-center mb-8">
                           <div className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-800 shadow-sm shadow-emerald-200/50">
                              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                           </div>
                        </div>

                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Berhasil Diubah</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-10 leading-relaxed font-medium">
                           {successMsg}
                        </p>

                        <Button 
                           variant="auth"
                           size="auth"
                           onClick={() => navigate('/login')}
                        >
                           Masuk Sekarang <ArrowRight className="w-5 h-5" />
                        </Button>
                     </motion.div>
                   )}
                </AnimatePresence>
             </div>
             
             {/* Bottom Brand decoration */}
             <div className="bg-slate-50 dark:bg-slate-800/50 py-6 text-center border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600">Secure Protocol v2.5</span>
             </div>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
