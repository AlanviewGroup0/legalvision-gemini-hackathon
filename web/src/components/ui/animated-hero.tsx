import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["before you click \"Sign in\"", "before you submit a form", "when a website asks you to agree"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full min-h-screen">
      <div className="container mx-auto h-full">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col min-h-screen">
          <div>
            <Button variant="neutral" size="sm" className="gap-4" asChild>
              <a href="#how-it-works">
                Learn how it works <MoveRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-4xl tracking-tighter text-center font-normal leading-tight font-poppins">
              <span className="block mb-3 font-poppins">We help you understand what you're agreeing to</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-2 md:pt-1 min-h-[1.2em]">
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold text-spektr-cyan-50 whitespace-nowrap tracking-normal text-4xl md:text-5xl font-satoshi"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>
              <span className="block text-xl md:text-2xl font-light text-foreground mt-3 text-center">
                Our tool shows you what the terms and conditions actually mean, in plain language
              </span>
          </div>
          <div className="flex flex-row gap-3">
            <Button size="lg" className="gap-4" variant="neutral" asChild>
              <a href="#how-to-install">
                Get started <MoveRight className="w-4 h-4" />
              </a>
            </Button>
            <Button size="lg" className="gap-4" variant="default" asChild>
              <a href="https://github.com/AlanviewGroup0/legalvision-gemini-hackathon" target="_blank" rel="noopener noreferrer">
                See the code <MoveRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
