import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "../../images/register-bg.jpg";
import Image2 from "../../images/logistics-background-2.png";
import Image3 from "../../images/logistics-background-3.png";
import Image4 from "../../images/logistics-background-4.jpg";

export default function Hero() {
  const slides = [
    {
      id: 1,
      backgroundImage: Image,
      title: "Global Logistics Excellence",
      description:
        "Seamless end-to-end supply chain solutions for businesses worldwide",
      buttonText: "Get Started",
      buttonLink: "/register",
      secondaryButtonText: "Learn More",
      secondaryButtonLink: "/services",
    },
    {
      id: 2,
      backgroundImage: Image2,
      title: "Efficient Shipping Solutions",
      description:
        "Fast and reliable freight services across air, land, and sea",
      buttonText: "Our Services",
      buttonLink: "/services",
      secondaryButtonText: "Contact Us",
      secondaryButtonLink: "/contact",
    },
    {
      id: 3,
      backgroundImage: Image3,
      title: "Worldwide Delivery Network",
      description:
        "Connecting businesses globally with our extensive transport solutions",
      buttonText: "See Network",
      buttonLink: "/services",
      secondaryButtonText: "Get Quote",
      secondaryButtonLink: "/contact",
    },
    {
      id: 4,
      backgroundImage: Image4,
      title: "Technology-Driven Logistics",
      description:
        "Advanced tracking and optimization for your supply chain needs",
      buttonText: "Learn More",
      buttonLink: "/about",
      secondaryButtonText: "Start Now",
      secondaryButtonLink: "/contact",
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlideIndex, setPrevSlideIndex] = useState(0);
  const [direction, setDirection] = useState<"right" | "left" | null>(null);
  const isAnimating = useRef(false);

  // Handle next slide
  const nextSlide = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setPrevSlideIndex(currentSlide);
    setDirection("right");
    setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);

    // Reset animation flag after animation completes
    setTimeout(() => {
      isAnimating.current = false;
    }, 800); // Match animation duration
  }, [currentSlide, slides.length]);

  // Auto slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating.current) {
        nextSlide();
      }
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [nextSlide]);

  // Handle previous slide
  const goToPrevSlide = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setPrevSlideIndex(currentSlide);
    setDirection("left");
    setCurrentSlide(
      (prevSlide) => (prevSlide - 1 + slides.length) % slides.length
    );

    // Reset animation flag after animation completes
    setTimeout(() => {
      isAnimating.current = false;
    }, 800); // Match animation duration
  }, [currentSlide, slides.length]);

  // Handle manual slide change
  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating.current || index === currentSlide) return;
      isAnimating.current = true;
      setPrevSlideIndex(currentSlide);
      setDirection(index > currentSlide ? "right" : "left");
      setCurrentSlide(index);

      // Reset animation flag after animation completes
      setTimeout(() => {
        isAnimating.current = false;
      }, 800); // Match animation duration
    },
    [currentSlide]
  );

  return (
    <section className="relative w-full h-[600px] overflow-hidden">
      {/* Background images with transitions */}
      {slides.map((slide, index) => {
        // Determine animation class based on current slide, previous slide and direction
        const getAnimationClass = () => {
          if (index === currentSlide && direction === "right") {
            return "animate-slideInRight";
          } else if (index === currentSlide && direction === "left") {
            return "animate-slideInLeft";
          } else if (index === prevSlideIndex && direction === "right") {
            return "animate-slideOutLeft";
          } else if (index === prevSlideIndex && direction === "left") {
            return "animate-slideOutRight";
          } else {
            return "";
          }
        };

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 bg-cover bg-center z-0 ${
              index === currentSlide || index === prevSlideIndex
                ? `${getAnimationClass()}`
                : "hidden"
            }`}
            style={{
              backgroundImage: `url('${slide.backgroundImage}')`,
              backgroundPosition: "center",
            }}
          >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
        );
      })}

      {/* Navigation Buttons - Styled to match the design */}
      <button
        onClick={goToPrevSlide}
        className="absolute left-2 sm:left-4 md:left-8 top-1/2 z-20 transform -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Previous slide"
        style={{
          // On mobile, push further to the edge
          left: "max(0.5rem, env(safe-area-inset-left, 0))",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 md:h-6 md:w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 md:right-8 top-1/2 z-20 transform -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Next slide"
        style={{
          // On mobile, push further to the edge
          right: "max(0.5rem, env(safe-area-inset-right, 0))",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 md:h-6 md:w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center text-white">
        {slides.map((slide, index) => {
          // Determine content animation class based on current direction
          const getContentAnimationClass = () => {
            if (index === currentSlide && direction === "right") {
              return "animate-slideInRight";
            } else if (index === currentSlide && direction === "left") {
              return "animate-slideInLeft";
            } else if (index === prevSlideIndex && direction === "right") {
              return "animate-slideOutLeft";
            } else if (index === prevSlideIndex && direction === "left") {
              return "animate-slideOutRight";
            } else {
              return "";
            }
          };

          return (
            <div
              key={slide.id}
              className={`w-[85%] mx-auto absolute left-0 right-0 ${
                index === currentSlide || index === prevSlideIndex
                  ? `${getContentAnimationClass()}`
                  : "hidden"
              }`}
            >
              {(index === currentSlide || index === prevSlideIndex) && (
                <>
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 animate-fadeIn">
                    {slide.title}
                  </h1>
                  <p className="text-lg sm:text-xl md:text-2xl mb-8 max-w-3xl animate-fadeIn animation-delay-200">
                    {slide.description}
                  </p>
                  <div className="flex flex-wrap gap-4 animate-fadeIn animation-delay-400">
                    <Link
                      to={slide.buttonLink}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-3 rounded transition duration-300"
                    >
                      {slide.buttonText}
                    </Link>
                    <Link
                      to={slide.secondaryButtonLink}
                      className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-6 py-3 rounded transition duration-300"
                    >
                      {slide.secondaryButtonText}
                    </Link>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Slider Indicators */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 transition-all duration-300 rounded-full ${
              index === currentSlide
                ? "w-8 bg-white"
                : "w-2 bg-white/60 hover:bg-white/80"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          ></button>
        ))}
      </div>
    </section>
  );
}
