import React, { useState, useCallback } from 'react';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '@/api/auth.api';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, ShieldQuestion } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { InfraErrorBoundary } from '../../components/superadmin/infra/InfraErrorBoundary';

// Zod Schema Validation Guard (Pilar 25)
const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid').min(1, 'Email wajib diisi')
});

export const ForgotPasswordPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setSuccessMsg(null);
    setErrorMsg(null);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setErrorMsg(validation.error.errors[0]?.message || 'Email tidak valid');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      setSuccessMsg(res.message || 'Tautan pemulihan telah dikirim. Silakan periksa kotak masuk atau folder spam email Anda.');
    } catch (err) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errorObj?.response?.data?.message || 'Kami tidak dapat memproses permintaan Anda saat ini. Silakan periksa kembali email Anda.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <InfraErrorBoundary hardeningModuleKey="auth_forgot_password">
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
                                <ShieldQuestion className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                             </div>
                          </div>

                          <h1 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2 tracking-tight">Lupa Kata Sandi?</h1>
                          <p className="text-slate-500 dark:text-slate-400 text-center mb-6 text-sm font-medium leading-relaxed">
                             Jangan khawatir, masukkan email Anda dan kami akan mengirimkan instruksi pemulihan.
                          </p>

                          <div className="space-y-6 w-full max-w-full min-w-0">
                              <Input 
                                 id="forgotEmail"
                                 aria-label="Email Terdaftar"
                                 label="Email Terdaftar"
                                 type="email"
                                 size="auth"
                                 leftIcon={<Mail />}
                                 placeholder="nama@sekolah.sch.id"
                                 value={email}
                                 onChange={(e) => setEmail(e.target.value)}
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
                                 disabled={!email}
                                 onClick={handleSubmit}
                              >
                                 Kirim Tautan Pemulihan <ArrowRight className="w-5 h-5" />
                              </Button>

                              <button 
                                onClick={() => navigate('/login')} 
                                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors pt-1 group"
                              >
                                 <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Kembali ke Login
                              </button>
                          </div>
                       </motion.div>
                     ) : (
                       <motion.div 
                          key="success"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center py-4"
                       >
                          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6">
                             <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tautan Terkirim!</h2>
                          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8">
                             {successMsg}
                          </p>
                          <Button 
                             variant="outline" 
                             className="w-full"
                             onClick={() => navigate('/login')}
                          >
                             Kembali ke Login
                          </Button>
                       </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            </Card>
          </motion.div>
        </main>

        <Footer />
      </div>
    </InfraErrorBoundary>
  );
});

export default ForgotPasswordPage;
