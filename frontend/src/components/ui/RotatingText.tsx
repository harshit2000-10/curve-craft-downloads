import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import './RotatingText.css';

type StaggerFrom = 'first' | 'last' | 'center' | 'random' | number;

interface RotatingTextProps {
  texts: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transition?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animate?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exit?: any;
  animatePresenceMode?: 'wait' | 'sync' | 'popLayout';
  animatePresenceInitial?: boolean;
  rotationInterval?: number;
  staggerDuration?: number;
  staggerFrom?: StaggerFrom;
  loop?: boolean;
  auto?: boolean;
  splitBy?: 'characters' | 'words' | 'lines' | string;
  onNext?: (index: number) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
  style?: React.CSSProperties;
}

export interface RotatingTextRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

function splitIntoCharacters(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seg = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.from(seg.segment(text), (s: any) => s.segment as string);
  }
  return Array.from(text);
}

const RotatingText = forwardRef<RotatingTextRef, RotatingTextProps>(function RotatingText(
  {
    texts,
    transition = { type: 'spring', damping: 25, stiffness: 300 },
    initial = { y: '100%' },
    animate = { y: 0 },
    exit = { y: '-120%' },
    animatePresenceMode = 'wait',
    animatePresenceInitial = false,
    rotationInterval = 2000,
    staggerDuration = 0.025,
    staggerFrom = 'last',
    loop = true,
    auto = true,
    splitBy = 'characters',
    onNext,
    mainClassName,
    splitLevelClassName,
    elementLevelClassName,
    style,
  },
  ref,
) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const splitText = useCallback(
    (text: string): string[] => {
      if (splitBy === 'characters') return splitIntoCharacters(text);
      if (splitBy === 'words') return text.split(' ');
      if (splitBy === 'lines') return text.split('\n');
      return text.split(splitBy);
    },
    [splitBy],
  );

  const elements = useMemo(
    () => splitText(texts[currentIndex]),
    [texts, currentIndex, splitText],
  );

  const getStaggerDelay = useCallback(
    (index: number, total: number): number => {
      const from = staggerFrom;
      if (from === 'first') return index * staggerDuration;
      if (from === 'last') return (total - 1 - index) * staggerDuration;
      if (from === 'center') return Math.abs(index - Math.floor(total / 2)) * staggerDuration;
      if (from === 'random') return Math.random() * (total - 1) * staggerDuration;
      if (typeof from === 'number') return Math.abs(index - from) * staggerDuration;
      return index * staggerDuration;
    },
    [staggerFrom, staggerDuration],
  );

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = (prev + 1) % texts.length;
      if (!loop && next === 0) return prev;
      onNext?.(next);
      return next;
    });
  }, [texts.length, loop, onNext]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = (prev - 1 + texts.length) % texts.length;
      onNext?.(next);
      return next;
    });
  }, [texts.length, onNext]);

  const handleJumpTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < texts.length) {
        setCurrentIndex(index);
        onNext?.(index);
      }
    },
    [texts.length, onNext],
  );

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    onNext?.(0);
  }, [onNext]);

  useImperativeHandle(ref, () => ({
    next: handleNext,
    previous: handlePrevious,
    jumpTo: handleJumpTo,
    reset: handleReset,
  }));

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(handleNext, rotationInterval);
    return () => clearInterval(id);
  }, [auto, rotationInterval, handleNext]);

  return (
    <motion.span
      className={`text-rotate ${mainClassName ?? ''}`}
      style={style}
      layout
    >
      <span className="text-rotate-sr-only">{texts[currentIndex]}</span>
      <AnimatePresence mode={animatePresenceMode} initial={animatePresenceInitial}>
        <motion.span
          key={currentIndex}
          className={`text-rotate-word ${splitLevelClassName ?? ''}`}
          aria-hidden
        >
          {elements.map((el, i) => (
            <motion.span
              key={i}
              className={`text-rotate-element ${elementLevelClassName ?? ''}`}
              initial={initial}
              animate={animate}
              exit={exit}
              transition={{ ...transition, delay: getStaggerDelay(i, elements.length) }}
            >
              {el === ' ' ? <span className="text-rotate-space">&nbsp;</span> : el}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
});

export default RotatingText;
