import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

export default function ProductExplanation() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const features = [
    "Automatically detects when you're viewing Terms of Service or Privacy Policy pages",
    "Analyzes the legal text using AI to identify key clauses and potential risks",
    "Explains complex legal language in plain, understandable terms",
    "Highlights important sections like data sharing, arbitration clauses, and liability limitations",
    "Shows you what you're agreeing to before you click accept"
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

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  }

  return (
    <section ref={ref} className="py-20 px-4">
      <div className="max-w-[720px] mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            variants={itemVariants}
            className="text-3xl md:text-4xl font-semibold text-gray-900 mb-12"
          >
            What it does
          </motion.h2>
          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex items-start"
              >
                <span className="text-gray-400 mr-4 mt-1">•</span>
                <p className="text-lg text-gray-700 leading-relaxed flex-1">
                  {feature}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
