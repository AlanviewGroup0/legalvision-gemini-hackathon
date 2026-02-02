import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

export default function PrivacyEthics() {
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
            className="text-3xl md:text-4xl font-semibold text-gray-900 mb-8"
          >
            Privacy & ethics
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-600 mb-6 leading-relaxed"
          >
            We believe that informed consent requires transparency—not just from 
            the services you use, but from the tools that help you understand them.
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-600 mb-6 leading-relaxed"
          >
            This extension processes legal documents to provide explanations. 
            We don't track your browsing beyond what's necessary for the extension 
            to function. We don't sell your data. We don't build profiles.
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-600 leading-relaxed"
          >
            Our goal is simple: help people make informed decisions about the 
            legal agreements they enter into. That's it.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
