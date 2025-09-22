"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Bot, Zap, TrendingUp } from "lucide-react"

export function LandingCTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="bg-gradient-to-br from-primary to-accent text-white border-0 shadow-2xl">
          <CardContent className="p-12 text-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-balance">Ready to Transform Your Trading?</h2>
                <p className="text-xl text-white/90 text-pretty max-w-2xl mx-auto">
                  Join thousands of successful traders using AI to generate consistent profits. Start your free trial
                  today and experience the future of forex trading.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">87.3%</div>
                  <div className="text-white/80">Average Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">$2.4M+</div>
                  <div className="text-white/80">Total Profits Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">24/7</div>
                  <div className="text-white/80">Automated Trading</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Bot className="w-5 h-5 mr-2" />
                  Start Free Trial
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 bg-transparent"
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  View Live Demo
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-8 pt-8 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-white/80" />
                  <span className="text-sm text-white/80">No Setup Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-white/80" />
                  <span className="text-sm text-white/80">MT5 Integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-white/80" />
                  <span className="text-sm text-white/80">30-Day Money Back</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
