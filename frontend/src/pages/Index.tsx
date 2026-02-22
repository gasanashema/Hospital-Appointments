import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, CalendarCheck, TrendingUp, Shield } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-healthcare.jpg";

const features = [
  {
    icon: Brain,
    title: "ML-Powered Predictions",
    description: "Our model analyzes patient history, demographics, and engagement to predict no-shows before they happen.",
  },
  {
    icon: CalendarCheck,
    title: "Smart Scheduling",
    description: "Optimize your appointment slots by identifying high-risk patients and sending targeted reminders.",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Analytics",
    description: "Track show rates, prediction accuracy, and trends with interactive dashboards updated in real time.",
  },
  {
    icon: Shield,
    title: "Actionable Insights",
    description: "Move from reactive to proactive care management with data-driven decisions.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Index = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container relative z-10 py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2  bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">
                AUCA INNOVATION CENTER
              </div>
              <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Predict No-Shows.{" "}
                <span className="text-gradient">Save Time.</span>
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                Health Sphere uses machine learning to forecast patient appointment
                no-shows, helping clinics reduce gaps, optimize schedules, and
                improve patient care.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/dashboard">
                    Open Dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/appointments">View Appointments</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="overflow-hidden rounded-2xl shadow-2xl">
                <img
                  src={heroImage}
                  alt="Doctor reviewing patient data on tablet in modern clinic"
                  className="h-full w-full object-cover"
                />
              </div>
              {/* Floating stat card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="absolute -bottom-4 -left-4 rounded-xl border bg-card p-4 shadow-lg lg:-bottom-6 lg:-left-6"
              >
                <div className="text-xs font-medium text-muted-foreground">Prediction Accuracy</div>
                <div className="font-display text-2xl font-bold text-primary">87.3%</div>
                <div className="text-xs text-success">↑ 4.2% this month</div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="font-display text-3xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="mt-3 text-muted-foreground">
            From data to decisions in real time
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="group rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/50">
        <div className="container py-14">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            {[
              { value: "87%", label: "Prediction Accuracy" },
              { value: "34%", label: "Reduction in No-Shows" },
              { value: "2,400+", label: "Appointments Analyzed" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className="font-display text-4xl font-extrabold text-primary">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-xl space-y-4"
        >
          <h2 className="font-display text-3xl font-bold text-foreground">
            Ready to Explore?
          </h2>
          <p className="text-muted-foreground">
            Dive into the dashboard and see how ML predictions can transform appointment management.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/dashboard">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </section>
    </Layout>
  );
};

export default Index;
