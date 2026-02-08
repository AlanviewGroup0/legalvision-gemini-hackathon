import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function Hero() {
  return (
    <header className="w-full min-h-[50vh] md:min-h-[70vh] bg-brutal-body flex items-center">
      <div className="max-w-container mx-auto px-4 md:px-8 lg:px-12 w-full py-16 md:py-24">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-6 md:gap-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-[-0.03em] leading-[1.05] text-brutal-text">
            We help you understand what you're agreeing to
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-brutal-text max-w-3xl leading-snug">
            Plain-language clarity before you sign in, submit forms, or accept terms.
          </p>
          <p className="text-lg md:text-xl font-medium text-brutal-text max-w-[55ch] leading-relaxed">
            Our tool shows you what the terms and conditions actually mean—so you can decide with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button size="lg" className="gap-2" variant="neutral" asChild>
              <a href="#how-to-install">
                Get started <MoveRight className="w-4 h-4" aria-hidden />
              </a>
            </Button>
            <Button size="lg" className="gap-2" variant="default" asChild>
              <a
                href="https://github.com/AlanviewGroup0/legalvision-gemini-hackathon"
                target="_blank"
                rel="noopener noreferrer"
              >
                See the code <MoveRight className="w-4 h-4" aria-hidden />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export { Hero };
