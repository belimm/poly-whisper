'use client'

import { useState, useEffect } from 'react'

interface TypewriterEffectProps {
  text: string
  className?: string
  loop?: boolean
  typeSpeed?: number
  eraseSpeed?: number
  pauseBeforeErase?: number
  pauseBeforeType?: number
}

export default function TypewriterEffect({
  text,
  className = '',
  loop = true,
  typeSpeed = 80,
  eraseSpeed = 50,
  pauseBeforeErase = 2000,
  pauseBeforeType = 500,
}: TypewriterEffectProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return

    let timeout: NodeJS.Timeout

    if (isTyping) {
      // Typing phase
      if (displayedText.length < text.length) {
        timeout = setTimeout(() => {
          setDisplayedText(text.slice(0, displayedText.length + 1))
        }, typeSpeed)
      } else {
        // Finished typing, pause before erasing
        if (loop) {
          setIsPaused(true)
          timeout = setTimeout(() => {
            setIsPaused(false)
            setIsTyping(false)
          }, pauseBeforeErase)
        }
      }
    } else {
      // Erasing phase
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1))
        }, eraseSpeed)
      } else {
        // Finished erasing, pause before typing again
        setIsPaused(true)
        timeout = setTimeout(() => {
          setIsPaused(false)
          setIsTyping(true)
        }, pauseBeforeType)
      }
    }

    return () => clearTimeout(timeout)
  }, [displayedText, isTyping, isPaused, text, typeSpeed, eraseSpeed, pauseBeforeErase, pauseBeforeType, loop])

  return (
    <span className={className}>
      {displayedText}
      <span className="animate-pulse">....</span>
    </span>
  )
}
