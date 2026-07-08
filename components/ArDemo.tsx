'use client'

import React, { useEffect, useRef, useState } from 'react'
import '../app/ar-demo.css'

export default function ArDemo() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExposed, setIsExposed] = useState(false)

  const scanInterval = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])
  // Refs for elements
  const pkgRef = useRef<HTMLDivElement>(null)
  const slRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const cornersRef = useRef<HTMLDivElement[]>([])
  const boxesRef = useRef<HTMLDivElement[]>([])
  const rowsRef = useRef<HTMLDivElement[]>([])
  const scoreRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const exposeRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement[]>([])

  const d = (ms: number) => new Promise(r => setTimeout(r, ms))

  const resetDemo = () => {
    if (scanInterval.current) clearInterval(scanInterval.current)
    if (pkgRef.current) pkgRef.current.style.opacity = '0'
    if (slRef.current) { slRef.current.style.opacity = '0'; slRef.current.style.top = '100px' }
    if (statusRef.current) { statusRef.current.style.opacity = '0'; statusRef.current.textContent = '● INITIALIZING' }
    cornersRef.current.forEach(c => { if(c) c.style.opacity = '0' })
    boxesRef.current.forEach(b => { if(b) { b.style.opacity = '0'; b.style.transform = 'scaleX(0.6)' } })
    rowsRef.current.forEach(r => { if(r) r.classList.remove('highlight-r', 'highlight-y', 'highlight-g') })
    if (scoreRef.current) { scoreRef.current.style.opacity = '0'; scoreRef.current.style.transform = 'translateY(12px)' }
    if (fillRef.current) { fillRef.current.style.transition = 'none'; fillRef.current.style.width = '0' }
    
    // Force reflow for transition reset
    setTimeout(() => {
      if (fillRef.current) fillRef.current.style.transition = 'width 1.2s cubic-bezier(.22,1,.36,1)'
    }, 50)
    
    if (exposeRef.current) {
        exposeRef.current.style.opacity = '0'
        exposeRef.current.textContent = '📸 EXPOSE ON SOCIAL MEDIA'
        exposeRef.current.style.color = '#FF3D00'
        exposeRef.current.style.borderColor = '#FF3D00'
        exposeRef.current.style.background = '#1a0505'
    }
    stepsRef.current.forEach(s => { if(s) s.classList.remove('visible') })
    setIsExposed(false)
  }

  const runDemo = async () => {
    setIsPlaying(true)
    
    if (statusRef.current) {
      statusRef.current.style.opacity = '1'
      statusRef.current.textContent = '● SCANNING'
    }
    cornersRef.current.forEach(c => { if(c) c.style.opacity = '1' })
    await d(500)

    if (slRef.current) slRef.current.style.opacity = '1'
    let top = 80; let dir = 1;
    scanInterval.current = setInterval(() => {
      top += dir * 2.5
      if (top > 440) dir = -1
      if (top < 80) dir = 1
      if (slRef.current) slRef.current.style.top = top + 'px'
    }, 16)

    if (stepsRef.current[0]) stepsRef.current[0].classList.add('visible')
    await d(2000)

    // Stop scanning
    if (scanInterval.current) clearInterval(scanInterval.current)
    if (slRef.current) slRef.current.style.opacity = '0'
    if (statusRef.current) statusRef.current.textContent = '● ANALYSIS COMPLETE'
    await d(300)

    // Now fade in the ingredient text box AFTER scanning is done
    if (pkgRef.current) pkgRef.current.style.opacity = '1'
    await d(400)

    const rowColors = ['highlight-g','highlight-r','highlight-r','highlight-y','highlight-y','highlight-y','']
    for (let i = 0; i < rowsRef.current.length; i++) {
      if (rowsRef.current[i] && rowColors[i]) {
        rowsRef.current[i].classList.add(rowColors[i])
      }
      await d(100)
    }

    if (stepsRef.current[1]) stepsRef.current[1].classList.add('visible')
    await d(300)

    for (let i = 0; i < boxesRef.current.length; i++) {
      if (boxesRef.current[i]) {
        boxesRef.current[i].style.opacity = '1'
        boxesRef.current[i].style.transform = 'scaleX(1)'
      }
      await d(150)
    }

    await d(300)

    if (stepsRef.current[2]) stepsRef.current[2].classList.add('visible')
    if (scoreRef.current) {
      scoreRef.current.style.opacity = '1'
      scoreRef.current.style.transform = 'translateY(0)'
    }
    await d(300)
    if (fillRef.current) fillRef.current.style.width = '24%'

    await d(600)
    if (stepsRef.current[3]) stepsRef.current[3].classList.add('visible')
    if (exposeRef.current) exposeRef.current.style.opacity = '1'

    await d(500)
    setIsPlaying(false)

    // Wait a few seconds, then loop automatically
    await d(4000)
    if (!isMounted.current) return
    resetDemo()
    await d(300)
    if (isMounted.current) {
      runDemo()
    }
  }

  const handleExpose = () => {
    setIsExposed(true)
    if (exposeRef.current) {
      exposeRef.current.textContent = '✓ SHARED — YOUR FOLLOWERS NOW KNOW'
      exposeRef.current.style.color = '#00C853'
      exposeRef.current.style.borderColor = '#00C853'
      exposeRef.current.style.background = '#00C85311'
    }
  }

  useEffect(() => {
    // Initial run
    let timer = setTimeout(runDemo, 600)
    return () => {
      clearTimeout(timer)
      if (scanInterval.current) clearInterval(scanInterval.current)
    }
  }, [])

  return (
    <div className="ar-demo-container">
      <div id="ss-stage">
        {/* Phone Mockup */}
        <div id="ss-phone-wrap">
          <div id="ss-phone">
            <div id="ss-notch"></div>
            <div id="ss-cam-feed">
              <div id="ss-pkg-bg"></div>
              <div id="ss-pkg" ref={pkgRef}>
                <div className="ss-ing-row" style={{fontSize: '7px', color: '#1a3a1a', marginBottom: '4px', letterSpacing: '2px'}}>INGREDIENTS</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[0] = el }}>Carbonated Water,</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[1] = el }}>Sugar/Glucose-Fructose,</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[2] = el }}>Caramel Colour,</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[3] = el }}>Phosphoric Acid,</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[4] = el }}>Natural Flavours,</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[5] = el }}>Caffeine.</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[6] = el }}></div>
              </div>
            </div>
            <div id="ss-hud">
              <div id="ss-status" ref={statusRef}>● INITIALIZING</div>
              <div className="ss-c" id="c1" ref={el => { if(el) cornersRef.current[0] = el }}></div>
              <div className="ss-c" id="c2" ref={el => { if(el) cornersRef.current[1] = el }}></div>
              <div className="ss-c" id="c3" ref={el => { if(el) cornersRef.current[2] = el }}></div>
              <div className="ss-c" id="c4" ref={el => { if(el) cornersRef.current[3] = el }}></div>
              <div id="ss-sl" ref={slRef}></div>
              <div className="ss-ar-box ar-g" id="b1" ref={el => { if(el) boxesRef.current[0] = el }}><span>Carbonated Water</span><span className="ss-badge">SAFE</span></div>
              <div className="ss-ar-box ar-r" id="b2" ref={el => { if(el) boxesRef.current[1] = el }}><span>High Sugar</span><span className="ss-badge">AVOID</span></div>
              <div className="ss-ar-box ar-r" id="b3" ref={el => { if(el) boxesRef.current[2] = el }}><span>Caramel Colour</span><span className="ss-badge">AVOID</span></div>
              <div className="ss-ar-box ar-y" id="b4" ref={el => { if(el) boxesRef.current[3] = el }}><span>Phosphoric Acid</span><span className="ss-badge">CAUTION</span></div>
              <div className="ss-ar-box ar-y" id="b5" ref={el => { if(el) boxesRef.current[4] = el }}><span>Caffeine</span><span className="ss-badge">CAUTION</span></div>
            </div>
            <div id="ss-score" ref={scoreRef}>
              <div id="ss-sc-top">
                <span id="ss-sc-lbl">HEALTH SCORE</span>
                <span id="ss-sc-val">24</span>
              </div>
              <div id="ss-sc-track"><div id="ss-sc-fill" ref={fillRef}></div></div>
            </div>
            <div id="ss-expose" ref={exposeRef} onClick={handleExpose}>📸 EXPOSE ON SOCIAL MEDIA</div>
          </div>
        </div>

        <div id="ss-divider"></div>

        {/* Narrative Steps */}
        <div id="ss-info">
          <div id="ss-steps">
            <div className="ss-step" id="st1" ref={el => { if(el) stepsRef.current[0] = el }}>
              <div className="ss-step-num">01</div>
              <div>
                <div className="ss-step-title">Snap Any Ingredient Label</div>
                <div className="ss-step-desc">No barcode needed. Blurry photo, crumpled wrapper — our Vision AI reads it all.</div>
              </div>
            </div>
            <div className="ss-step" id="st2" ref={el => { if(el) stepsRef.current[1] = el }}>
              <div className="ss-step-num">02</div>
              <div>
                <div className="ss-step-title">AI Flags Every Risk Instantly</div>
                <div className="ss-step-desc">AR boxes lock onto harmful chemicals in milliseconds. Red = Avoid. Yellow = Caution. Green = Safe.</div>
                <div style={{display: 'flex', gap: '6px', marginTop: '6px'}}>
                  <span className="ss-step-tag tag-r">AVOID</span>
                  <span className="ss-step-tag tag-y">CAUTION</span>
                  <span className="ss-step-tag tag-g">SAFE</span>
                </div>
              </div>
            </div>
            <div className="ss-step" id="st3" ref={el => { if(el) stepsRef.current[2] = el }}>
              <div className="ss-step-num">03</div>
              <div>
                <div className="ss-step-title">Get Your Health Score</div>
                <div className="ss-step-desc">FSSAI compliance check + personalized score based on your dietary profile.</div>
              </div>
            </div>
            <div className="ss-step" id="st4" ref={el => { if(el) stepsRef.current[3] = el }}>
              <div className="ss-step-num">04</div>
              <div>
                <div className="ss-step-title">Find Cleaner Alternatives</div>
                <div className="ss-step-desc">ScanSafe automatically surfaces safer swaps available nearby — at comparable prices.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
