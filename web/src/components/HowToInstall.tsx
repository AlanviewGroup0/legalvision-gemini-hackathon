import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Download, Settings, ToggleLeft, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

import downloadZipVideo from "@/assets/videos/download_zip.mp4";
import goToExtensionsVideo from "@/assets/videos/go_to_extentions.mp4";
import enableDeveloperModeVideo from "@/assets/videos/enable_developer_mode.mp4";
import loadUnpackedVideo from "@/assets/videos/load_unpacked.mp4";

export default function HowToInstall() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const steps = [
    {
      number: "1",
      icon: Download,
      title: "Download the ZIP",
      description: "Get the extension package file",
      video: downloadZipVideo,
      buttonLink:
        "https://github.com/AlanviewGroup0/legalvision-gemini-hackathon/releases/tag/V0.1",
      buttonText: "Download",
    },
    {
      number: "2",
      icon: Settings,
      title: "Open chrome extensions page",
      description: "Navigate to Chrome's extensions page",
      video: goToExtensionsVideo,
    },
    {
      number: "3",
      icon: ToggleLeft,
      title: "Enable Developer Mode",
      description: "Toggle the developer mode switch",
      video: enableDeveloperModeVideo,
    },
    {
      number: "4",
      icon: FolderOpen,
      title: "Load unpacked",
      description: "Select the extracted extension folder",
      video: loadUnpackedVideo,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <section
      id="how-to-install"
      ref={ref}
      className="py-10 md:py-16 px-4 md:px-8 lg:px-12"
      aria-labelledby="how-to-install-title"
    >
      <div className="max-w-container mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            id="how-to-install-title"
            variants={cardVariants}
            className="text-3xl md:text-4xl font-black uppercase tracking-wider text-brutal-text text-center mb-6"
          >
            How to install
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.article
                  key={index}
                  variants={cardVariants}
                  className="flex flex-col bg-brutal-section border-[3px] border-brutal-border p-4 shadow-brutal-section"
                >
                  <div className="aspect-video bg-brutal-container border-2 border-brutal-border mb-4 flex items-center justify-center overflow-hidden">
                    {step.video ? (
                      <video
                        src={step.video}
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                        loop
                        autoPlay
                        preload="metadata"
                        aria-label={`Video: ${step.title}`}
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Icon
                          className="w-8 h-8 mx-auto text-brutal-text mb-2"
                          aria-hidden
                        />
                        <p className="text-brutal-text text-sm font-medium">
                          Video placeholder
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-center flex flex-col flex-1">
                    <span
                      className="inline-flex items-center justify-center w-10 h-10 border-2 border-brutal-border bg-brutal-container font-black text-brutal-text text-base mb-2"
                      aria-hidden
                    >
                      {step.number}
                    </span>
                    <h3 className="text-xl font-semibold text-brutal-text mb-1">
                      {step.title}
                    </h3>
                    <p className="text-lg text-brutal-text font-medium leading-relaxed mb-3 flex-1">
                      {step.description}
                    </p>
                    {step.buttonLink && step.buttonText && (
                      <Button
                        asChild
                        size="sm"
                        variant="default"
                        className="w-full mt-auto"
                      >
                        <a
                          href={step.buttonLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {step.buttonText}
                        </a>
                      </Button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
