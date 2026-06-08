import { Check, X, Zap, Star, Building2, ArrowRight, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

const plans = [
  {
    id: "free",
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "Perfect for getting started with AI-assisted studying",
    icon: Star,
    color: "slate",
    badge: null,
    features: [
      { label: "1 GB Cloud Storage", included: true },
      { label: "5 AI Questions per day", included: true },
      { label: "3 Document uploads per month", included: true },
      { label: "Basic AI summaries", included: true },
      { label: "5 Quiz generations per month", included: true },
      { label: "Community support", included: true },
      { label: "Unlimited AI Questions", included: false },
      { label: "Priority AI processing", included: false },
      { label: "Advanced analytics", included: false },
      { label: "Priority support", included: false },
    ],
    cta: "Get Started Free",
  },
  {
    id: "pro",
    name: "Pro",
    price: { monthly: 19, annual: 15 },
    description: "For serious students who want the full AI advantage",
    icon: Zap,
    color: "blue",
    badge: "Most Popular",
    features: [
      { label: "100 GB Cloud Storage", included: true },
      { label: "Unlimited AI Questions", included: true },
      { label: "Unlimited Document uploads", included: true },
      { label: "Advanced AI summaries", included: true },
      { label: "Unlimited Quiz generations", included: true },
      { label: "Priority support", included: true },
      { label: "Priority AI processing", included: true },
      { label: "Advanced analytics", included: true },
      { label: "Citation references", included: true },
      { label: "Export to PDF & DOCX", included: true },
    ],
    cta: "Start Pro Trial",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: { monthly: 49, annual: 39 },
    description: "For institutions, teams, and power users",
    icon: Building2,
    color: "purple",
    badge: "Best Value",
    features: [
      { label: "Unlimited Cloud Storage", included: true },
      { label: "Unlimited AI Questions", included: true },
      { label: "Unlimited Document uploads", included: true },
      { label: "Custom AI summaries", included: true },
      { label: "Unlimited Quiz generations", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "Priority AI processing", included: true },
      { label: "Advanced analytics & reporting", included: true },
      { label: "API access", included: true },
      { label: "White-label options", included: true },
    ],
    cta: "Contact Sales",
  },
];

const faqs = [
  {
    q: "Can I switch plans anytime?",
    a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges or credits.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes! Pro comes with a 14-day free trial. No credit card required to start.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, MasterCard, Amex), PayPal, and bank transfers for Enterprise plans.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Your data is safe. If you exceed the free plan storage limit after downgrading, you'll have 30 days to reduce your storage before any files are affected.",
  },
  {
    q: "Do you offer student discounts?",
    a: "Yes! Students with a valid .edu email address get 50% off the Pro plan. Contact support to apply the discount.",
  },
];

export function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleSelectPlan = (planId: string) => {
    if (planId === "free") {
      navigate("/register");
    } else if (planId === "enterprise") {
      toast.success("Redirecting to contact sales...");
    } else {
      navigate("/app/subscription/upgrade");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <span className="font-bold text-slate-900">AI Study Hub</span>
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/login")} className="text-slate-600 font-semibold hover:text-slate-900 transition-colors">Login</button>
            <button onClick={() => navigate("/register")} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">Get Started</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold mb-6 border border-blue-100">
            <Zap className="w-4 h-4" /> Simple, transparent pricing
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 mb-5">
            Study smarter,<br />
            <span className="text-blue-600">not harder</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
            Choose the plan that fits your study goals. Upgrade or downgrade anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-2">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${!isAnnual ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isAnnual ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              Annual
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-lg font-bold">-20%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, i) => {
            const price = isAnnual ? plan.price.annual : plan.price.monthly;
            const isPopular = plan.id === "pro";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-white rounded-[2rem] border-2 p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${
                  isPopular ? "border-blue-500 shadow-blue-100 shadow-xl" : "border-slate-100"
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                    isPopular ? "bg-blue-600 text-white" : "bg-purple-600 text-white"
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${
                  plan.color === "blue" ? "bg-blue-50" : plan.color === "purple" ? "bg-purple-50" : "bg-slate-50"
                }`}>
                  <plan.icon className={`w-6 h-6 ${
                    plan.color === "blue" ? "text-blue-600" : plan.color === "purple" ? "text-purple-600" : "text-slate-500"
                  }`} />
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-slate-500 mb-5">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-extrabold text-slate-900">${price}</span>
                    <span className="text-slate-400 mb-2">/mo</span>
                  </div>
                  {isAnnual && plan.price.monthly > 0 && (
                    <p className="text-sm text-slate-400 line-through">${plan.price.monthly}/mo billed monthly</p>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-3.5 font-extrabold rounded-2xl transition-all mb-8 flex items-center justify-center gap-2 ${
                    isPopular
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                      : plan.color === "purple"
                      ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20"
                      : "bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {plan.cta} <ArrowRight className="w-4 h-4" />
                </button>

                <div className="space-y-3">
                  {plan.features.map((feat) => (
                    <div key={feat.label} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${feat.included ? "bg-emerald-50" : "bg-slate-50"}`}>
                        {feat.included
                          ? <Check className="w-3 h-3 text-emerald-500" />
                          : <X className="w-3 h-3 text-slate-300" />}
                      </div>
                      <span className={`text-sm ${feat.included ? "text-slate-700" : "text-slate-400 line-through"}`}>
                        {feat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <p className="text-slate-500">Everything you need to know about our pricing</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-bold text-slate-900 pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-slate-500 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-slate-500 mb-4">Still have questions?</p>
            <button
              onClick={() => toast.success("Opening support chat...")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors"
            >
              <HelpCircle className="w-5 h-5" /> Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
