import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { FileSearch, Zap, Shield } from 'lucide-react'
import DisplayCards from '@/components/ui/display-cards'

export default function WhyDifferent() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  const cards = [
    {
      icon: <FileSearch className="size-4 text-blue-300" />,
      title: "Not just a summary",
      description: "Identify clauses and explain implications",
      date: "Deep analysis",
      iconClassName: "text-blue-500",
      titleClassName: "text-blue-500",
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      icon: <Zap className="size-4 text-blue-300" />,
      title: "Works automatically",
      description: "Works as you browse, no copy-paste",
      date: "Zero friction",
      iconClassName: "text-blue-500",
      titleClassName: "text-blue-500",
      className:
        "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      icon: <Shield className="size-4 text-blue-300" />,
      title: "Privacy-first",
      description: "Browsing stays private with local analysis",
      date: "Secure by design",
      iconClassName: "text-blue-500",
      titleClassName: "text-blue-500",
      className:
        "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
    },
  ]

  return (
    <section ref={ref} className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            variants={itemVariants}
            className="text-3xl md:text-4xl font-semibold text-gray-900 mb-12 text-center"
          >
            Why it's different
          </motion.h2>
          
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center"
          >
            <div className="w-full max-w-3xl">
              <DisplayCards cards={cards} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
