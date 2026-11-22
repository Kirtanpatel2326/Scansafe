'use client'

import React, { useEffect, useRef, useState } from 'react'
import '../app/ar-demo.css'

export default function ArDemo() {
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExposed, setIsExposed] = useState(false)

  const scanInterval = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Element refs
  const pkgRef = useRef<HTMLDivElement>(null)
  const slRef = useRef<HTMLDivElement>(null)
  const statusBarRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
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
    if (statusRef.current) { 
      statusRef.current.style.opacity = '0'
      statusRef.current.textContent = '● INITIALIZING' 
    }
    if (statusBarRef.current) statusBarRef.current.style.opacity = '0'

    boxesRef.current.forEach(b => { 
      if (b) { b.style.opacity = '0'; b.style.transform = 'scaleX(0.7)' } 
    })
    rowsRef.current.forEach(r => { 
      if (r) r.classList.remove('highlight-r', 'highlight-y', 'highlight-g') 
    })
    if (scoreRef.current) { 
      scoreRef.current.style.opacity = '0'
      scoreRef.current.style.transform = 'translateY(14px)' 
    }
    if (fillRef.current) { 
      fillRef.current.style.transition = 'none'
      fillRef.current.style.width = '0' 
    }
    
    setTimeout(() => {
      if (fillRef.current) fillRef.current.style.transition = 'width 1.2s cubic-bezier(.22,1,.36,1)'
    }, 50)
    
    if (exposeRef.current) {
      exposeRef.current.style.opacity = '0'
      exposeRef.current.innerHTML = '📊 Share Health Breakdown'
      exposeRef.current.style.color = '#10B981'
      exposeRef.current.style.borderColor = 'rgba(16, 185, 129, 0.45)'
      exposeRef.current.style.background = 'rgba(6, 24, 15, 0.9)'
    }
    stepsRef.current.forEach(s => { 
      if (s) s.classList.remove('active-step') 
    })
    setActiveStepIndex(0)
    setIsExposed(false)
  }

  const runDemo = async () => {
    setIsPlaying(true)
    setActiveStepIndex(0)
    
    // Step 1: Laser scanning active
    if (statusBarRef.current) statusBarRef.current.style.opacity = '1'
    if (statusRef.current) {
      statusRef.current.style.opacity = '1'
      statusRef.current.textContent = '● SCANNING LABEL'
    }
    if (stepsRef.current[0]) {
      stepsRef.current[0].classList.add('active-step')
    }
    await d(400)

    if (slRef.current) slRef.current.style.opacity = '1'
    let top = 100; let dir = 1;
    scanInterval.current = setInterval(() => {
      top += dir * 2.8
      if (top > 480) dir = -1
      if (top < 100) dir = 1
      if (slRef.current) slRef.current.style.top = top + 'px'
    }, 16)

    await d(1800)

    // Stop scanning, analysis complete
    if (scanInterval.current) clearInterval(scanInterval.current)
    if (slRef.current) slRef.current.style.opacity = '0'
    if (statusRef.current) statusRef.current.textContent = '● ANALYSIS COMPLETE'
    await d(300)

    // Step 2: Ingredient breakdown
    setActiveStepIndex(1)
    if (stepsRef.current[0]) stepsRef.current[0].classList.remove('active-step')
    if (stepsRef.current[1]) stepsRef.current[1].classList.add('active-step')

    if (pkgRef.current) pkgRef.current.style.opacity = '1'
    await d(300)

    const rowColors = ['highlight-g','highlight-r','highlight-r','highlight-y','highlight-y','highlight-y','']
    for (let i = 0; i < rowsRef.current.length; i++) {
      if (rowsRef.current[i] && rowColors[i]) {
        rowsRef.current[i].classList.add(rowColors[i])
      }
      await d(70)
    }

    for (let i = 0; i < boxesRef.current.length; i++) {
      if (boxesRef.current[i]) {
        boxesRef.current[i].style.opacity = '1'
        boxesRef.current[i].style.transform = 'scaleX(1)'
      }
      await d(110)
    }

    await d(400)

    // Step 3: Nutrition Health Score
    setActiveStepIndex(2)
    if (stepsRef.current[1]) stepsRef.current[1].classList.remove('active-step')
    if (stepsRef.current[2]) stepsRef.current[2].classList.add('active-step')

    if (scoreRef.current) {
      scoreRef.current.style.opacity = '1'
      scoreRef.current.style.transform = 'translateY(0)'
    }
    await d(300)
    if (fillRef.current) fillRef.current.style.width = '24%'

    await d(600)

    // Step 4: Cleaner Alternatives CTA
    setActiveStepIndex(3)
    if (stepsRef.current[2]) stepsRef.current[2].classList.remove('active-step')
    if (stepsRef.current[3]) stepsRef.current[3].classList.add('active-step')

    if (exposeRef.current) exposeRef.current.style.opacity = '1'

    await d(500)
    setIsPlaying(false)

    // Wait and loop automatically
    await d(4500)
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
      exposeRef.current.innerHTML = '✓ Health Breakdown Ready to Share'
      exposeRef.current.style.color = '#10B981'
      exposeRef.current.style.borderColor = '#10B981'
      exposeRef.current.style.background = 'rgba(16, 185, 129, 0.18)'
    }
  }

  useEffect(() => {
    let timer = setTimeout(runDemo, 500)
    return () => {
      clearTimeout(timer)
      if (scanInterval.current) clearInterval(scanInterval.current)
    }
  }, [])

  return (
    <div className="ar-demo-container">
      <div id="ss-stage">
        
        {/* PHONE MOCKUP (PRO GLASSMORPHISM TITANIUM CHASSIS) */}
        <div id="ss-phone-wrap">
          {/* Ambient Glow Aura */}
          <div className="phone-ambient-glow" />

          <div id="ss-phone">
            {/* Dynamic Island */}
            <div id="ss-notch">
              <div className="island-camera" />
              <div className="island-sensor" />
            </div>

            {/* Camera Viewfinder Feed */}
            <div id="ss-cam-feed">
              <div id="ss-pkg-bg" />
              
              {/* Camera OCR Label Detection Layer */}
              <div id="ss-pkg" ref={pkgRef}>
                <div className="ss-ing-header">DETECTED INGREDIENTS</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[0] = el }}>Carbonated Water,</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[1] = el }}>Sugar/Glucose-Fructose,</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[2] = el }}>Caramel Colour,</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[3] = el }}>Phosphoric Acid,</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[4] = el }}>Natural Flavours,</div>
                <div className="ss-ing-row" ref={el => { if(el) rowsRef.current[5] = el }}>Caffeine.</div>
              </div>
            </div>

            {/* Scanning HUD Overlays */}
            <div id="ss-hud">
              {/* Laser Sweep Line */}
              <div id="ss-sl" ref={slRef}></div>

              {/* Status Header: ┌ ● ANALYSIS COMPLETE ┐ */}
              <div id="ss-status-bar" ref={statusBarRef}>
                <span className="ss-reticle-bracket">┌</span>
                <span id="ss-status" ref={statusRef}>● ANALYSIS COMPLETE</span>
                <span className="ss-reticle-bracket">┐</span>
              </div>

              {/* Interactive Floating Ingredient Pills */}
              <div className="ss-ar-box ar-g" id="b1" ref={el => { if(el) boxesRef.current[0] = el }}>
                <span className="ss-ing-name">Carbonated Water</span>
                <span className="ss-badge">SAFE</span>
              </div>
              <div className="ss-ar-box ar-r" id="b2" ref={el => { if(el) boxesRef.current[1] = el }}>
                <span className="ss-ing-name">High Sugar / Glucose</span>
                <span className="ss-badge">AVOID</span>
              </div>
              <div className="ss-ar-box ar-r" id="b3" ref={el => { if(el) boxesRef.current[2] = el }}>
                <span className="ss-ing-name">Caramel Colour</span>
                <span className="ss-badge">AVOID</span>
              </div>
              <div className="ss-ar-box ar-y" id="b4" ref={el => { if(el) boxesRef.current[3] = el }}>
                <span className="ss-ing-name">Phosphoric Acid</span>
                <span className="ss-badge">CAUTION</span>
              </div>
              <div className="ss-ar-box ar-y" id="b5" ref={el => { if(el) boxesRef.current[4] = el }}>
                <span className="ss-ing-name">Caffeine</span>
                <span className="ss-badge">CAUTION</span>
              </div>
            </div>

            {/* Bottom Health Score Card */}
            <div id="ss-score" ref={scoreRef}>
              <div id="ss-sc-top">
                <span id="ss-sc-lbl">HEALTH SCORE</span>
                <span id="ss-sc-val">24</span>
              </div>
              <div id="ss-sc-track">
                <div id="ss-sc-fill" ref={fillRef}></div>
              </div>
            </div>

            {/* Action CTA Button */}
            <div id="ss-expose" ref={exposeRef} onClick={handleExpose}>
              <span className="ss-chart-bars">
                <span className="bar-blue" />
                <span className="bar-green" />
                <span className="bar-red" />
              </span>
              <span>Share Health Breakdown</span>
            </div>
          </div>
        </div>

        {/* 4-STEP NARRATIVE FLOW (WORLD-CLASS FIGMA DESIGN) */}
        <div id="ss-info">
          <div id="ss-steps">
            
            {/* Step 01 */}
            <div 
              className={`ss-step ${activeStepIndex === 0 ? 'active-step' : ''}`}
              id="st1" 
              ref={el => { if(el) stepsRef.current[0] = el }}
            >
              <div className="ss-step-num">01</div>
              <div className="ss-step-body">
                <div className="ss-step-title">Scan Packaged Label</div>
                <div className="ss-step-desc">
                  Scan packaged-food labels to understand listed ingredients and nutrition. AI can misread labels; review the extracted information.
                </div>
              </div>
            </div>

            {/* Step 02 */}
            <div 
              className={`ss-step ${activeStepIndex === 1 ? 'active-step' : ''}`}
              id="st2" 
              ref={el => { if(el) stepsRef.current[1] = el }}
            >
              <div className="ss-step-num">02</div>
              <div className="ss-step-body">
                <div className="ss-step-title">Analyzes Listed Ingredients & Additives</div>
                <div className="ss-step-desc">
                  Highlights listed additives and potential allergens based on nutritional guidelines.
                </div>
                <div className="ss-tags-row">
                  <span className="ss-step-tag tag-r">AVOID</span>
                  <span className="ss-step-tag tag-y">CAUTION</span>
                  <span className="ss-step-tag tag-g">SAFE</span>
                </div>
              </div>
            </div>

            {/* Step 03 */}
            <div 
              className={`ss-step ${activeStepIndex === 2 ? 'active-step' : ''}`}
              id="st3" 
              ref={el => { if(el) stepsRef.current[2] = el }}
            >
              <div className="ss-step-num">03</div>
              <div className="ss-step-body">
                <div className="ss-step-title">Get Nutrition Score</div>
                <div className="ss-step-desc">
                  Nutrition-based estimate score. Missing or unreadable information is marked as unknown.
                </div>
              </div>
            </div>

            {/* Step 04 */}
            <div 
              className={`ss-step ${activeStepIndex === 3 ? 'active-step' : ''}`}
              id="st4" 
              ref={el => { if(el) stepsRef.current[3] = el }}
            >
              <div className="ss-step-num">04</div>
              <div className="ss-step-body">
                <div className="ss-step-title">Find Cleaner Alternatives</div>
                <div className="ss-step-desc">
                  ScanSafe automatically surfaces safer swaps available nearby — at comparable prices.
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
