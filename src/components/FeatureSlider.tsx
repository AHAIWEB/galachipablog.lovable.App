import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mockPosts } from "@/data/categories";

const slides = mockPosts.slice(0, 4);

export default function FeatureSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <div className="relative rounded-xl overflow-hidden group bg-foreground/5 aspect-[16/9]">
      <img
        src={slide.image}
        alt={slide.title}
        className="w-full h-full object-cover transition-all duration-700"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
        <span className="tag-news mb-2 inline-block">{slide.category}</span>
        <h2 className="font-heading font-bold text-lg md:text-2xl text-card leading-tight">
          {slide.title}
        </h2>
      </div>

      {/* Nav buttons */}
      <button
        onClick={() => setCurrent(p => (p - 1 + slides.length) % slides.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-card/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => setCurrent(p => (p + 1) % slides.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-card/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 right-4 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-card w-5" : "bg-card/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
