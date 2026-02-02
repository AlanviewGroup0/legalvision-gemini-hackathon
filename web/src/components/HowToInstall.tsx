import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Download, Settings, ToggleLeft, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HowToInstall() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const steps = [
    {
      number: "1",
      icon: Download,
      title: "Download the ZIP",
      description: "Get the extension package file",
      videoPlaceholder: true,
      buttonLink: "https://github.com/AlanviewGroup0/legalvision-gemini-hackathon/releases/tag/V0.1",
      buttonText: "Download"
    },
    {
      number: "2",  
      icon: Settings,
      title: "Open chrome extensions page",
      description: "Navigate to Chrome's extensions page",
    },  
    {
      number: "3",
      icon: ToggleLeft,
      title: "Enable Developer Mode",
      description: "Toggle the developer mode switch",
      videoPlaceholder: true
    },
    {
      number: "4",
      icon: FolderOpen,
      title: "Load unpacked",
      description: "Select the extracted extension folder",
      videoPlaceholder: true
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  }

  return (
    <section id="how-to-install" ref={ref} className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            variants={cardVariants}
            className="text-3xl md:text-4xl font-semibold text-gray-900 mb-12 text-center"
          >
            How to install
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  className="flex flex-col"
                >
                  <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    <div className="text-center">
                      <Icon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500 text-xs">Video placeholder</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mb-2">
                      <span className="text-gray-700 font-semibold text-sm">{step.number}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {step.description}
                    </p>
                    {step.buttonLink && step.buttonText && (
                      <Button
                        asChild
                        size="sm"
                        variant="default"
                        className="w-full"
                      >
                        <a href={step.buttonLink} target="_blank" rel="noopener noreferrer">
                          {step.buttonText}
                        </a>
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
