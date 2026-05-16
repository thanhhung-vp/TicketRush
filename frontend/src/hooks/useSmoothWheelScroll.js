import { useEffect } from 'react';

const WHEEL_LINE_HEIGHT = 40;
const MIN_COARSE_WHEEL_DELTA = 32;
const SCROLL_EASE = 0.14;
const SCROLL_MULTIPLIER = 0.9;
const STOP_THRESHOLD = 0.6;
const SCROLL_RESET_EVENT = 'ticketrush:scroll-reset';

function normalizeWheelDelta(event) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * WHEEL_LINE_HEIGHT;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function canScrollElement(element, deltaY) {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  const canOverflow = overflowY === 'auto' || overflowY === 'scroll';
  if (!canOverflow || element.scrollHeight <= element.clientHeight) return false;

  if (deltaY > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  }
  return element.scrollTop > 1;
}

function hasScrollableAncestor(target, deltaY) {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (canScrollElement(node, deltaY)) return true;
    node = node.parentElement;
  }
  return false;
}

function shouldUseNativeScroll(event, deltaY) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey) return true;
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return true;
  if (Math.abs(deltaY) < MIN_COARSE_WHEEL_DELTA) return true;
  if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return true;
  return hasScrollableAncestor(event.target, deltaY);
}

export function useSmoothWheelScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');
    if (reduceMotion.matches || !finePointer.matches) return undefined;

    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let frameId = 0;

    const getMaxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

    const animate = () => {
      currentY += (targetY - currentY) * SCROLL_EASE;
      const distance = targetY - currentY;

      if (Math.abs(distance) < STOP_THRESHOLD) {
        currentY = targetY;
        window.scrollTo(0, targetY);
        frameId = 0;
        return;
      }

      window.scrollTo(0, currentY);
      frameId = window.requestAnimationFrame(animate);
    };

    const onWheel = (event) => {
      const deltaY = normalizeWheelDelta(event);
      if (shouldUseNativeScroll(event, deltaY)) return;

      event.preventDefault();
      currentY = window.scrollY;
      targetY = Math.max(0, Math.min(getMaxScroll(), targetY + deltaY * SCROLL_MULTIPLIER));

      if (!frameId) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const syncPosition = () => {
      if (frameId) return;
      currentY = window.scrollY;
      targetY = window.scrollY;
    };

    const resetPosition = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      currentY = 0;
      targetY = 0;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', syncPosition, { passive: true });
    window.addEventListener('resize', syncPosition);
    window.addEventListener(SCROLL_RESET_EVENT, resetPosition);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', syncPosition);
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener(SCROLL_RESET_EVENT, resetPosition);
    };
  }, []);
}
