import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

export default function Problem() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
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
            The problem
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-600 mb-6 leading-relaxed"
          >
            Terms of Service and Privacy Policies are written in dense legal language. 
            They're intentionally long, complex, and filled with jargon. Reading them 
            thoroughly would take hours for each service you use.
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-600 mb-6 leading-relaxed"
          >
            So we click "I agree" without understanding what we're agreeing to. 
            We accept clauses about data sharing, arbitration, liability waivers, 
            and more—often without realizing it.
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-600 leading-relaxed"
          >
            This isn't informed consent. It's blind acceptance.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
