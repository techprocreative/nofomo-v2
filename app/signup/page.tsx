import { SignupForm } from "@/components/auth/signup-form"
import { Zap } from "lucide-react"

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-2xl text-foreground">ForexAI Pro</h1>
              <p className="text-sm text-muted-foreground">AI Trading Platform</p>
            </div>
          </div>
        </div>

        <SignupForm />
      </div>
    </div>
  )
}
