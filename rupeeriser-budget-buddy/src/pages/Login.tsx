import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api, { endpoints, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, Mail, Lock, User, ArrowRight, 
  TrendingUp, ShieldCheck, CheckCircle2, X, Copy, Mail as MailIcon, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- COMPONENTS ---
const MoneyRain = ({ active }: { active: boolean }) => {
  if (!active) return null;
  const emojis = ['💸', '💰', '💵', '🚀', '💎', '🤑'];
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div key={i} className="absolute animate-fall"
          style={{
            left: `${Math.random() * 100}%`, top: `-${Math.random() * 20}%`,
            fontSize: `${Math.random() * 20 + 20}px`, animationDuration: `${Math.random() * 2 + 1.5}s`,
            animationDelay: `${Math.random() * 0.5}s`, opacity: Math.random() * 0.5 + 0.5,
          }}>
          {emojis[Math.floor(Math.random() * emojis.length)]}
        </div>
      ))}
    </div>
  );
};

const FloatingBlob = ({ className }: { className?: string }) => (
  <div className={cn("absolute rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob", className)} />
);

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();

  // Login States
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  
  // Translation
  const { language, setLanguage } = useApp();
  const t = {
    EN: {
      signTitle: 'Join the Elite', loginTitle: 'Welcome Back',
      signDesc: 'Start your financial journey today.', loginDesc: 'Enter your credentials to access your vault.',
      name: 'Full Name', email: 'Email Address', pass: 'Password',
      forgot: 'Forgot Password?', btnSign: 'Create Account', btnLogin: 'Sign In',
      switchSign: 'Login to Account', switchLogin: 'Create Free Account'
    },
    TA: {
      signTitle: 'எலைட் குழுவில் இணையுங்கள்', loginTitle: 'மீண்டும் வரவேற்கிறோம்',
      signDesc: 'உங்கள் நிதிப் பயணத்தை இன்றே தொடங்குங்கள்.', loginDesc: 'உள்ளே செல்ல விவரங்களை உள்ளிடுக.',
      name: 'முழு பெயர்', email: 'மின்னஞ்சல் முகவரி', pass: 'கடவுச்சொல்',
      forgot: 'கடவுச்சொல் மறந்துவிட்டதா?', btnSign: 'கணக்கை உருவாக்கு', btnLogin: 'உள்நுழைக',
      switchSign: 'கணக்கில் உள்நுழைய', switchLogin: 'இலவச கணக்கை உருவாக்கு'
    },
    HI: {
      signTitle: 'हमारे साथ जुड़ें', loginTitle: 'वापसी पर स्वागत है',
      signDesc: 'आज ही अपनी वित्तीय यात्रा शुरू करें।', loginDesc: 'अपने वॉल्ट तक पहुंचने के लिए क्रेडेंशियल्स दर्ज करें।',
      name: 'पूरा नाम', email: 'ईमेल पता', pass: 'पासवर्ड',
      forgot: 'पासवर्ड भूल गए?', btnSign: 'खाता बनाएं', btnLogin: 'लॉग इन करें',
      switchSign: 'खाते में लॉग इन करें', switchLogin: 'मुफ़्त खाता बनाएँ'
    }
  }[language];

  // Data States
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      @keyframes fall {
        0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
      }
      .animate-blob { animation: blob 7s infinite; }
      .animate-fall { animation: fall linear forwards; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const triggerSuccess = (token: string, name: string) => {
    setShowCelebration(true);
    setTimeout(() => {
      login(token, name);
      toast.success(`Welcome, ${name}!`);
      navigate('/dashboard');
    }, 2000);
  };

  const validateForm = (): boolean => {
    // Validate name if signup
    if (isSignUp) {
      if (!formData.name.trim()) {
        toast.error("Name is required");
        return false;
      }
      if (formData.name.trim().length < 2) {
        toast.error("Name must be at least 2 characters");
        return false;
      }
    }

    // Validate email
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    // Validate password
    if (!formData.password) {
      toast.error("Password is required");
      return false;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return false;
    }
    if (formData.password.length > 72) {
      toast.error("Password is too long (max 72 characters)");
      return false;
    }

    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form first
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let res;
      
      if (isSignUp) {
        // ✅ Signup request
        res = await endpoints.signup({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });
        
        if (res.data?.access_token) {
          triggerSuccess(res.data.access_token, res.data.user_name || formData.name || 'User');
        }
      } else {
        // ✅ Login request
        res = await endpoints.login({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });
        
        if (res.data?.access_token) {
          triggerSuccess(res.data.access_token, res.data.user_name || 'User');
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);

      // ✅ Extract error message properly
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '' });
  };

  const handleToggleMode = () => {
    resetForm();
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden font-sans selection:bg-blue-500/30">
      <MoneyRain active={showCelebration} />

      {/* --- DESKTOP LEFT SIDE --- */}
      <div className="hidden lg:flex w-1/2 bg-black relative flex-col justify-between p-12 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-60 bg-cover bg-center transition-transform hover:scale-110"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1611974765270-ca12586343bb?q=80&w=2070&auto=format&fit=crop')`,
            transitionDuration: '20s'
          }} />
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/80 via-black/60 to-black/40" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
            <TrendingUp className="text-blue-400 w-7 h-7" />
          </div>
          <span className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            RupeeRiser
          </span>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold leading-tight">
              Master your money. <br/>
              <span className="text-blue-400">Design your future.</span>
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed">
              Experience the next generation of financial tracking. AI-powered insights, seamless syncing, and total control.
            </p>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Bank-Grade Security</p>
              <p className="text-sm text-gray-400">Your data is encrypted and safe.</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE (Form) --- */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
      
        {/* Language Switcher */}
        <div className="absolute top-6 right-6 z-50 flex gap-2 items-center bg-secondary/50 backdrop-blur-md rounded-2xl p-1 px-3 border border-border shadow-sm">
          <Globe className="w-4 h-4 text-muted-foreground delay-75 transition-all" />
          <select 
            className="bg-transparent text-foreground text-sm font-semibold py-2 outline-none cursor-pointer"
            value={language}
            onChange={(e: any) => setLanguage(e.target.value)}
          >
            <option className="bg-background text-foreground" value="EN">English</option>
            <option className="bg-background text-foreground" value="TA">தமிழ் (Tamil)</option>
            <option className="bg-background text-foreground" value="HI">हिन्दी (Hindi)</option>
          </select>
        </div>

        <FloatingBlob className="bg-blue-500 w-96 h-96 top-0 -left-20 animation-delay-2000" />
        <FloatingBlob className="bg-purple-500 w-96 h-96 bottom-0 -right-20 animation-delay-4000" />

        <div className="w-full max-w-[420px] relative z-10 backdrop-blur-xl bg-white/80 dark:bg-black/60 border border-white/20 dark:border-white/10 p-8 rounded-[40px] shadow-2xl shadow-blue-500/10">
          
          <div className="text-center space-y-3 mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              {isSignUp ? t.signTitle : t.loginTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? t.signDesc : t.loginDesc}
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {isSignUp && (
              <div className="relative group">
                <User className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder={t.name} 
                  value={formData.name} 
                  onChange={e => handleInputChange('name', e.target.value)}
                  disabled={loading}
                  required 
                  className="pl-12 h-12 rounded-2xl" 
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input 
                type="email" 
                placeholder={t.email} 
                value={formData.email} 
                onChange={e => handleInputChange('email', e.target.value)}
                disabled={loading}
                required 
                className="pl-12 h-12 rounded-2xl" 
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input 
                type="password" 
                placeholder={t.pass} 
                value={formData.password} 
                onChange={e => handleInputChange('password', e.target.value)}
                disabled={loading}
                required 
                className="pl-12 h-12 rounded-2xl" 
              />
            </div>
            
            {!isSignUp && (
              <div className="flex justify-end mt-1">
                <button 
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  disabled={loading}
                  className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                >
                  {t.forgot}
                </button>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-14 mt-4 rounded-2xl font-bold text-lg bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {isSignUp ? t.btnSign : t.btnLogin}
                </>
              ) : (
                isSignUp ? t.btnSign : t.btnLogin
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-8 text-center pt-6 border-t border-border">
            <button 
              onClick={handleToggleMode}
              disabled={loading}
              className="text-blue-600 font-bold hover:underline disabled:opacity-50"
            >
              {isSignUp ? t.switchSign : t.switchLogin}
            </button>
          </div>

        </div>
      </div>

      {/* --- FORGOT PASSWORD MODAL --- */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-border flex flex-col scale-in">
            
            {/* Header */}
            <div className="bg-secondary/50 p-4 flex items-center justify-between border-b">
              <h3 className="font-bold text-lg">Password Recovery</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowForgotModal(false)} 
                className="rounded-full h-8 w-8 text-muted-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Body */}
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mx-auto flex items-center justify-center text-blue-600 mb-2 shadow-sm">
                <MailIcon className="w-8 h-8" />
              </div>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                If you have forgotten your password, please contact support directly. Send an email to the address below.
              </p>
              
              <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded-xl">
                <span className="font-mono text-sm font-semibold text-foreground select-all">
                  raptiledataworks@gmail.com
                </span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 hover:bg-muted"
                  onClick={() => {
                    navigator.clipboard.writeText("raptiledataworks@gmail.com");
                    toast.success("Email copied to clipboard!");
                  }}
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Our team will help you recover your account within 1–2 business days.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 bg-secondary/20 flex gap-2 justify-end border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowForgotModal(false)} 
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const subject = encodeURIComponent("Password Recovery Request - RupeeRiser");
                  const body = encodeURIComponent(
                    "Hello RupeeRiser Support,\n\nI have forgotten my password and would like to request a password reset/recovery.\n\nMy Account Email: [TYPE YOUR EMAIL HERE]\nMy Name: [TYPE YOUR NAME HERE]\n\nPlease let me know the next steps.\n\nThank you!"
                  );
                  window.open(`mailto:raptiledataworks@gmail.com?subject=${subject}&body=${body}`);
                  setShowForgotModal(false);
                }} 
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                Open Mail App
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}