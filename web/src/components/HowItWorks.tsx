import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { FileText, Search, Hash, Brain, PanelRight } from 'lucide-react'
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid'

export default function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const steps = [
    {
      Icon: FileText,
      name: "User opens a Terms or Privacy page",
      description: "You navigate to a website's legal documents, as you normally would.",
      href: "#",
      cta: "Learn more",
      background: <div />,
      className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3",
    },
    {
      Icon: Search,
      name: "Extension detects legal content",
      description: "The extension automatically recognizes when you're viewing Terms of Service or Privacy Policy pages.",
      href: "#",
      cta: "Learn more",
      background: <div />,
      className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
    },
    {
      Icon: Hash,
      name: "Hash check (cached or new)",
      description: "The extension checks if it has analyzed this document before, using a content hash for efficiency.",
      href: "#",
      cta: "Learn more",
      background: <div />,
      className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
    },
    {
      Icon: Brain,
      name: "AI analysis runs",
      description: "If it's a new or updated document, AI analyzes the text to identify key clauses, risks, and important sections.",
      href: "#",
      cta: "Learn more",
      background: <div />,
      className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2",
    },
    {
      Icon: PanelRight,
      name: "Insight panel appears",
      description: "A clean, unobtrusive panel appears with explanations, highlighting what you need to know before agreeing.",
      href: "#",
      cta: "Learn more",
      background: <div />,
      className: "lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-4",
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const titleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  }

  return (
    <section id="how-it-works" ref={ref} className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            variants={titleVariants}
            className="text-3xl md:text-4xl font-semibold text-gray-900 mb-12 text-center"
          >
            How it works
          </motion.h2>
          <BentoGrid className="lg:grid-rows-3">
            {steps.map((step) => (
              <BentoCard key={step.name} {...step} />
            ))}
          </BentoGrid>
        </motion.div>
      </div>
    </section>
  )
}
