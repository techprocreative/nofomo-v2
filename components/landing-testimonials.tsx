"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Marcus Chen",
    role: "Professional Trader",
    avatar: "MC",
    content:
      "ForexAI Pro transformed my trading completely. The AI strategies consistently outperform my manual trading, and I've seen a 340% increase in profits since switching.",
    rating: 5,
  },
  {
    name: "Sarah Williams",
    role: "Hedge Fund Manager",
    avatar: "SW",
    content:
      "The backtesting capabilities are incredible. We can validate strategies against 10+ years of data in minutes. It's become an essential tool for our fund.",
    rating: 5,
  },
  {
    name: "David Rodriguez",
    role: "Retail Trader",
    avatar: "DR",
    content:
      "I was skeptical about AI trading, but the results speak for themselves. My win rate went from 45% to 78% in just 3 months. The platform is intuitive and powerful.",
    rating: 5,
  },
  {
    name: "Emma Thompson",
    role: "Quantitative Analyst",
    avatar: "ET",
    content:
      "The real-time optimization feature is game-changing. The AI continuously improves strategy performance without any manual intervention. Absolutely brilliant.",
    rating: 5,
  },
  {
    name: "James Park",
    role: "Day Trader",
    avatar: "JP",
    content:
      "24/7 automated trading means I'm making money even while I sleep. The MT5 integration is seamless, and the risk management features give me peace of mind.",
    rating: 5,
  },
  {
    name: "Lisa Anderson",
    role: "Investment Advisor",
    avatar: "LA",
    content:
      "My clients love the transparency and performance. We've been able to offer consistent returns that traditional strategies simply can't match. Highly recommended.",
    rating: 5,
  },
]

export function LandingTestimonials() {
  return (
    <section id="testimonials" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Trusted by{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              15,000+ Traders
            </span>
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-3xl mx-auto">
            Join thousands of successful traders who have transformed their trading with AI-powered strategies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-muted-foreground italic">"{testimonial.content}"</p>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-card-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
