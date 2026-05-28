'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

export default function PitchDeckPage() {
  const [activeSlide, setActiveSlide] = useState('s1')

  const slideIds = [
    's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'
  ]

  const goTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      setActiveSlide(id)
    }
  }

  useEffect(() => {
    // Scroll intersection observer to sync dot indicator on scroll
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSlide(entry.target.id)
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)
    slideIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    // Scroll fade-in observer
    const fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1 }
    )

    const targets = document.querySelectorAll('.fade-in')
    targets.forEach((t) => fadeObserver.observe(t))

    return () => {
      observer.disconnect()
      fadeObserver.disconnect()
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a08] text-[#f5f3ec] selection:bg-emerald-500 selection:text-black">
      {/* Dynamic Style overrides matching original CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;0,900;1,400;1,700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        
        :root {
          --ink: #0a0a08;
          --ink2: #3a3a34;
          --ink3: #7a7a70;
          --paper: #f5f3ec;
          --paper2: #eceae0;
          --paper3: #e2dfd4;
          --green: #1a5c30;
          --green2: #236b38;
          --green3: #2e8046;
          --green-light: #e8f2eb;
          --green-pale: #f0f7f2;
          --amber: #b85000;
          --amber-bg: #fff4e8;
          --red: #b81a1a;
          --red-bg: #fdf0f0;
          --fd: 'Neue Haas Grotesk Display Pro', 'Helvetica Neue', sans-serif;
          --fh: 'Playfair Display', serif;
          --fc: 'IBM Plex Mono', monospace;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          background: var(--ink);
          color: var(--paper);
          font-family: var(--fd);
          overflow-y: scroll;
        }

        /* ─── SLIDE SYSTEM ─── */
        .slide {
          min-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 80px 72px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }

        /* progress dots */
        .nav {
          position: fixed; right: 28px; top: 50%; transform: translateY(-50%);
          display: flex; flex-direction: column; gap: 10px; z-index: 100;
        }
        .nav-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(255, 255, 255, .2); cursor: pointer;
          transition: all .3s; border: none;
        }
        .nav-dot.active { background: var(--green3); transform: scale(1.4); }
        .nav-dot:hover { background: rgba(255, 255, 255, .5); }

        /* slide number */
        .slide-num {
          position: absolute; bottom: 28px; right: 36px;
          font-family: var(--fc); font-size: 11px; color: rgba(255, 255, 255, .25);
          letter-spacing: 2px;
        }

        /* ─── SLIDE 1: COVER ─── */
        #s1 {
          background: var(--ink);
          align-items: center;
          text-align: center;
          padding: 60px 40px;
        }

        #s1::before {
          content: ''; position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 800px 600px at 50% 30%, rgba(30, 92, 48, .35) 0%, transparent 70%),
            radial-gradient(ellipse 400px 400px at 20% 80%, rgba(30, 92, 48, .12) 0%, transparent 60%);
        }

        .cover-tag {
          font-family: var(--fc); font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
          color: rgba(255, 255, 255, .45); margin-bottom: 32px;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          position: relative;
        }
        .cover-tag::before, .cover-tag::after {
          content: ''; width: 40px; height: 1px; background: rgba(255, 255, 255, .2);
        }

        .cover-logo {
          position: relative; z-index: 1;
          font-family: var(--fh);
          font-size: clamp(64px, 10vw, 96px);
          font-weight: 900;
          letter-spacing: -3px;
          line-height: 1;
          margin-bottom: 8px;
          color: white;
        }
        .cover-logo span { color: var(--green3); }

        .cover-tagline {
          position: relative; z-index: 1;
          font-family: var(--fh);
          font-size: clamp(20px, 3vw, 28px);
          font-style: italic;
          color: rgba(255, 255, 255, .55);
          letter-spacing: -.3px;
          margin-bottom: 56px;
        }

        .cover-stats {
          position: relative; z-index: 1;
          display: flex; gap: 2px; justify-content: center;
          margin-bottom: 56px;
          flex-wrap: wrap;
        }
        .cs {
          padding: 20px 32px;
          border: 1px solid rgba(255, 255, 255, .08);
          background: rgba(255, 255, 255, .04);
          min-width: 180px;
        }
        .cs:first-of-type { border-radius: 12px 0 0 12px; }
        .cs:last-of-type { border-radius: 0 12px 12px 0; }
        .cs-n {
          font-family: var(--fh); font-size: 32px; font-weight: 700;
          color: var(--green3); display: block; line-height: 1; margin-bottom: 4px;
        }
        .cs-l { font-size: 11px; color: rgba(255, 255, 255, .4); letter-spacing: .5px; }

        .cover-bottom {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 16px;
          padding-top: 48px; border-top: 1px solid rgba(255, 255, 255, .08);
          font-size: 12px; color: rgba(255, 255, 255, .35);
          letter-spacing: .3px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ─── SLIDE 2: PROBLEM ─── */
        #s2 { background: var(--paper); color: var(--ink); }

        .slide-eyebrow {
          font-family: var(--fc); font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
          color: var(--ink3); margin-bottom: 16px;
          display: flex; align-items: center; gap: 10px;
        }
        .slide-eyebrow::after { content: ''; flex: 1; height: 1px; background: var(--paper3); }

        .slide-h {
          font-family: var(--fh);
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 700;
          letter-spacing: -1.5px;
          line-height: 1.05;
          color: var(--ink);
          margin-bottom: 48px;
          max-width: 620px;
        }
        .slide-h em { font-style: italic; color: var(--green); }

        .problem-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 800px; }
        @media(max-width: 640px) {
          .problem-grid { grid-template-columns: 1fr; }
          .slide { padding: 60px 24px; }
        }

        .prob-card {
          background: var(--paper2);
          border: 1px solid var(--paper3);
          border-radius: 16px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .prob-card::before {
          content: attr(data-n);
          position: absolute; top: -10px; right: 16px;
          font-family: var(--fh); font-size: 80px; font-weight: 900;
          color: rgba(0, 0, 0, .04); line-height: 1;
        }
        .prob-icon { font-size: 28px; margin-bottom: 12px; display: block; }
        .prob-title { font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 6px; }
        .prob-desc { font-size: 13px; color: var(--ink3); line-height: 1.6; }
        .prob-stat {
          display: inline-block; margin-top: 10px;
          font-family: var(--fc); font-size: 11px;
          background: var(--red-bg); color: var(--red);
          padding: 3px 10px; border-radius: 100px;
          border: 1px solid rgba(184, 26, 26, .15);
        }

        /* ─── SLIDE 3: SOLUTION ─── */
        #s3 { background: var(--green); color: white; }

        #s3 .slide-eyebrow { color: rgba(255, 255, 255, .5); }
        #s3 .slide-eyebrow::after { background: rgba(255, 255, 255, .12); }
        #s3 .slide-h { color: white; }
        #s3 .slide-h em { color: var(--paper2); }

        .solution-split { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; max-width: 900px; }
        @media(max-width: 768px) {
          .solution-split { grid-template-columns: 1fr; }
        }

        .solution-flow { display: flex; flex-direction: column; gap: 0; }
        .flow-step {
          display: flex; gap: 16px; align-items: flex-start;
          padding: 16px 0;
          border-bottom: 1px solid rgba(255, 255, 255, .12);
        }
        .flow-step:last-child { border-bottom: none; }
        .flow-num {
          font-family: var(--fh); font-size: 28px; font-weight: 700;
          color: rgba(255, 255, 255, .25); min-width: 28px; line-height: 1.1;
        }
        .flow-title { font-size: 14px; font-weight: 600; color: white; margin-bottom: 3px; }
        .flow-desc { font-size: 12px; color: rgba(255, 255, 255, .6); line-height: 1.5; }

        .solution-moats { display: flex; flex-direction: column; gap: 12px; }
        .moat {
          background: rgba(255, 255, 255, .1);
          border: 1px solid rgba(255, 255, 255, .15);
          border-radius: 14px;
          padding: 16px 18px;
          display: flex; align-items: flex-start; gap: 12px;
        }
        .moat-badge {
          font-family: var(--fc); font-size: 9px; font-weight: 500;
          letter-spacing: 1.5px; text-transform: uppercase;
          background: rgba(255, 255, 255, .15);
          padding: 3px 9px; border-radius: 100px;
          color: rgba(255, 255, 255, .9);
          white-space: nowrap; flex-shrink: 0; margin-top: 2px;
        }
        .moat-text { font-size: 13px; color: rgba(255, 255, 255, .85); line-height: 1.5; }

        /* ─── SLIDE 4: MARKET ─── */
        #s4 { background: var(--ink); }
        #s4 .slide-eyebrow { color: rgba(255, 255, 255, .4); }
        #s4 .slide-h { color: white; }

        .market-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 64px; align-items: start; max-width: 960px; }
        @media(max-width: 768px) {
          .market-layout { grid-template-columns: 1fr; gap: 32px; }
        }

        .tam-stack { display: flex; flex-direction: column; gap: 12px; }
        .tam-ring {
          border-radius: 16px;
          padding: 20px 22px;
          display: flex; align-items: center; justify-content: space-between;
          position: relative; overflow: hidden;
        }
        .tam-ring::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
        }
        .tam-t { background: rgba(255, 255, 255, .04); border: 1px solid rgba(255, 255, 255, .08); }
        .tam-t::before { background: rgba(255, 255, 255, .15); }
        .tam-s { background: rgba(46, 128, 70, .12); border: 1px solid rgba(46, 128, 70, .2); }
        .tam-s::before { background: var(--green3); }
        .tam-so { background: rgba(46, 128, 70, .2); border: 1px solid rgba(46, 128, 70, .3); }
        .tam-so::before { background: var(--green3); }
        .tam-label { font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, .6); }
        .tam-sub { font-size: 11px; color: rgba(255, 255, 255, .35); margin-top: 2px; }
        .tam-val { font-family: var(--fh); font-size: 24px; font-weight: 700; color: white; text-align: right; }
        .tam-unit { font-size: 11px; color: rgba(255, 255, 255, .4); display: block; text-align: right; }

        .market-facts { display: flex; flex-direction: column; gap: 16px; }
        .mf {
          padding: 16px 0;
          border-bottom: 1px solid rgba(255, 255, 255, .07);
        }
        .mf:last-child { border-bottom: none; }
        .mf-stat {
          font-family: var(--fh); font-size: 36px; font-weight: 700;
          color: var(--green3); line-height: 1; margin-bottom: 4px;
        }
        .mf-label { font-size: 12px; color: rgba(255, 255, 255, .5); line-height: 1.5; }

        /* ─── SLIDE 5: COMPETITION ─── */
        #s5 { background: var(--paper); color: var(--ink); }
        #s5 .slide-h { max-width: none; }

        .comp-table { width: 100%; border-collapse: collapse; max-width: 820px; }
        .comp-table th {
          font-family: var(--fc); font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--ink3); text-align: left;
          padding: 10px 14px; border-bottom: 2px solid var(--paper3);
        }
        .comp-table th.you-col {
          color: var(--green);
          background: var(--green-pale);
          border-radius: 12px 12px 0 0;
        }
        .comp-table td {
          padding: 11px 14px;
          border-bottom: 1px solid var(--paper2);
          font-size: 13px; color: var(--ink2);
          vertical-align: middle;
        }
        .comp-table td:first-child { font-weight: 500; color: var(--ink); font-size: 12px; }
        .comp-table td.you-col { background: var(--green-pale); color: var(--green); font-weight: 600; }
        .comp-table tr:last-child td { border-bottom: none; }
        .yes-tick { color: var(--green); font-weight: 700; }
        .no-cross { color: var(--ink3); }
        .you-tick { color: var(--green); font-weight: 700; }

        /* ─── SLIDE 6: TRACTION PROOF ─── */
        #s6 { background: var(--ink); }
        #s6 .slide-eyebrow { color: rgba(255, 255, 255, .4); }
        #s6 .slide-h { color: white; }

        .traction-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; max-width: 900px; margin-bottom: 36px; }
        @media(max-width: 640px) {
          .traction-grid { grid-template-columns: 1fr; }
        }
        .tr-card {
          background: rgba(255, 255, 255, .04);
          border: 1px solid rgba(255, 255, 255, .08);
          border-radius: 16px; padding: 22px;
        }
        .tr-n { font-family: var(--fh); font-size: 40px; font-weight: 700; color: var(--green3); line-height: 1; margin-bottom: 4px; }
        .tr-l { font-size: 12px; color: rgba(255, 255, 255, .5); line-height: 1.4; }
        .tr-src { font-family: var(--fc); font-size: 10px; color: rgba(255, 255, 255, .25); margin-top: 8px; letter-spacing: .5px; }

        .proof-quote {
          max-width: 700px;
          border-left: 3px solid var(--green3);
          padding-left: 24px;
          margin-bottom: 36px;
        }
        .pq-text {
          font-family: var(--fh); font-size: 22px; font-style: italic;
          color: rgba(255, 255, 255, .8); line-height: 1.45; margin-bottom: 8px;
        }
        .pq-src { font-size: 12px; color: rgba(255, 255, 255, .35); }

        .yuka-proof { display: flex; gap: 24px; flex-wrap: wrap; }
        .yp {
          background: rgba(46, 128, 70, .12); border: 1px solid rgba(46, 128, 70, .2);
          border-radius: 12px; padding: 14px 18px;
        }
        .yp-n { font-family: var(--fh); font-size: 24px; font-weight: 700; color: var(--green3); margin-bottom: 2px; }
        .yp-l { font-size: 11px; color: rgba(255, 255, 255, .5); }

        /* ─── SLIDE 7: PRODUCT ─── */
        #s7 { background: var(--paper); color: var(--ink); }
        .product-split { display: grid; grid-template-columns: 1.1fr 1fr; gap: 56px; align-items: start; max-width: 900px; }
        @media(max-width: 768px) {
          .product-split { grid-template-columns: 1fr; gap: 32px; }
        }

        .feature-list { display: flex; flex-direction: column; gap: 0; }
        .feat-item {
          display: flex; gap: 14px; align-items: flex-start;
          padding: 14px 0; border-bottom: 1px solid var(--paper2);
        }
        .feat-item:last-child { border-bottom: none; }
        .feat-badge {
          font-family: var(--fc); font-size: 9px; letter-spacing: 1px;
          padding: 3px 8px; border-radius: 100px;
          white-space: nowrap; flex-shrink: 0; margin-top: 2px;
          font-weight: 500;
        }
        .fb-now { background: var(--green-light); color: var(--green); }
        .fb-q2 { background: #e8f0fa; color: #1a3a8a; }
        .fb-q3 { background: #f5e8fa; color: #6b1a8a; }
        .feat-name { font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 2px; }
        .feat-why { font-size: 12px; color: var(--ink3); line-height: 1.5; }

        .stack-visual {
          background: var(--paper2); border-radius: 20px;
          padding: 24px; border: 1px solid var(--paper3);
        }
        .stack-title { font-family: var(--fc); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--ink3); margin-bottom: 16px; }
        .stack-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid var(--paper3);
        }
        .stack-row:last-child { border-bottom: none; }
        .stack-layer { font-size: 12px; color: var(--ink3); }
        .stack-tech { font-family: var(--fc); font-size: 11px; font-weight: 500; color: var(--ink); }

        /* ─── SLIDE 8: BUSINESS MODEL ─── */
        #s8 { background: var(--ink); }
        #s8 .slide-eyebrow { color: rgba(255, 255, 255, .4); }
        #s8 .slide-h { color: white; }

        .biz-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; max-width: 900px; }
        @media(max-width: 768px) {
          .biz-layout { grid-template-columns: 1fr; gap: 32px; }
        }

        .plan-cards { display: flex; flex-direction: column; gap: 10px; }
        .plan {
          border-radius: 16px; padding: 18px 20px;
          display: flex; align-items: center; justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, .08);
          background: rgba(255, 255, 255, .04);
        }
        .plan.featured {
          background: rgba(46, 128, 70, .15);
          border-color: rgba(46, 128, 70, .35);
        }
        .plan-name { font-size: 14px; font-weight: 600; color: white; margin-bottom: 2px; }
        .plan-desc { font-size: 11px; color: rgba(255, 255, 255, .45); }
        .plan-price { text-align: right; }
        .plan-num { font-family: var(--fh); font-size: 22px; font-weight: 700; color: var(--green3); }
        .plan-period { font-size: 11px; color: rgba(255, 255, 255, .35); display: block; }

        .unit-econ { display: flex; flex-direction: column; gap: 12px; }
        .ue-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 11px 0; border-bottom: 1px solid rgba(255, 255, 255, .06);
        }
        .ue-row:last-child { border-bottom: none; }
        .ue-label { font-size: 12px; color: rgba(255, 255, 255, .5); }
        .ue-val { font-family: var(--fh); font-size: 18px; font-weight: 600; color: white; }
        .ue-val.pos { color: var(--green3); }
        .ue-val.neg { color: #f87171; }

        .projections {
          grid-column: 1/-1;
          display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;
          border-top: 1px solid rgba(255, 255, 255, .08);
          padding-top: 28px;
        }
        @media(max-width: 640px) {
          .projections { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
        .proj-cell { text-align: center; }
        .proj-mo { font-family: var(--fc); font-size: 10px; color: rgba(255, 255, 255, .35); letter-spacing: 1px; margin-bottom: 6px; }
        .proj-users { font-family: var(--fh); font-size: 20px; font-weight: 700; color: white; line-height: 1; margin-bottom: 3px; }
        .proj-mrr { font-size: 11px; color: var(--green3); }

        /* ─── SLIDE 9: WHY NOW + INDIA ─── */
        #s9 { background: var(--paper); color: var(--ink); }

        .why-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; max-width: 860px; }
        @media(max-width: 768px) {
          .why-grid { grid-template-columns: 1fr; }
        }
        .why-card {
          background: var(--paper2); border: 1px solid var(--paper3);
          border-radius: 16px; padding: 20px;
        }
        .why-stat { font-family: var(--fh); font-size: 32px; font-weight: 700; color: var(--green); margin-bottom: 4px; }
        .why-label { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
        .why-desc { font-size: 12px; color: var(--ink3); line-height: 1.5; }

        .india-bar {
          margin-top: 36px; max-width: 860px;
          background: var(--green); border-radius: 16px;
          padding: 24px 28px;
          display: flex; align-items: center; gap: 24px;
          color: white;
        }
        @media(max-width: 640px) {
          .india-bar { flex-direction: column; text-align: center; }
        }
        .india-flag { font-size: 32px; flex-shrink: 0; }
        .india-title { font-size: 15px; font-weight: 700; color: white; margin-bottom: 4px; }
        .india-desc { font-size: 12px; color: rgba(255, 255, 255, .75); line-height: 1.5; }

        /* ─── SLIDE 10: TEAM ─── */
        #s10 { background: var(--ink); }
        #s10 .slide-eyebrow { color: rgba(255, 255, 255, .4); }
        #s10 .slide-h { color: white; }

        .team-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; max-width: 800px; }
        @media(max-width: 640px) {
          .team-layout { grid-template-columns: 1fr; }
        }

        .founder-card {
          background: rgba(255, 255, 255, .04); border: 1px solid rgba(255, 255, 255, .08);
          border-radius: 20px; padding: 28px;
        }
        .founder-avatar {
          width: 56px; height: 56px; border-radius: 16px;
          background: rgba(46, 128, 70, .2); border: 1px solid rgba(46, 128, 70, .3);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 16px;
        }
        .founder-name { font-family: var(--fh); font-size: 20px; font-weight: 700; color: white; margin-bottom: 2px; }
        .founder-title { font-size: 12px; color: var(--green3); font-weight: 500; margin-bottom: 14px; }
        .founder-points { display: flex; flex-direction: column; gap: 6px; }
        .fp { font-size: 12px; color: rgba(255, 255, 255, .55); display: flex; gap: 8px; align-items: flex-start; line-height: 1.4; }
        .fp::before { content: '→'; color: var(--green3); flex-shrink: 0; }

        .advisor-row {
          grid-column: 1/-1;
          border-top: 1px solid rgba(255, 255, 255, .08);
          padding-top: 24px;
        }
        .adv-title { font-family: var(--fc); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255, 255, 255, .3); margin-bottom: 14px; }
        .adv-chips { display: flex; gap: 10px; flex-wrap: wrap; }
        .adv-chip {
          background: rgba(255, 255, 255, .05); border: 1px solid rgba(255, 255, 255, .1);
          border-radius: 100px; padding: 7px 16px;
          font-size: 12px; color: rgba(255, 255, 255, .7);
        }

        /* ─── SLIDE 11: ASK ─── */
        #s11 {
          background: var(--paper); color: var(--ink);
          justify-content: center;
        }

        .ask-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; max-width: 900px; align-items: start; }
        @media(max-width: 768px) {
          .ask-layout { grid-template-columns: 1fr; gap: 32px; }
        }

        .use-of-funds { display: flex; flex-direction: column; gap: 0; }
        .uof {
          display: flex; align-items: stretch; gap: 0;
          border-bottom: 1px solid var(--paper2);
        }
        .uof:last-child { border-bottom: none; }
        .uof-pct {
          font-family: var(--fh); font-size: 32px; font-weight: 700;
          color: var(--green); min-width: 80px;
          padding: 16px 0;
          display: flex; align-items: center;
        }
        .uof-body { padding: 16px 0 16px 16px; border-left: 2px solid var(--paper3); }
        .uof-title { font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 3px; }
        .uof-desc { font-size: 12px; color: var(--ink3); line-height: 1.5; }

        .milestones { display: flex; flex-direction: column; gap: 0; }
        .ms {
          display: flex; gap: 16px; align-items: flex-start;
          padding: 14px 0; border-bottom: 1px solid var(--paper2);
        }
        .ms:last-child { border-bottom: none; }
        .ms-time {
          font-family: var(--fc); font-size: 10px; font-weight: 500;
          letter-spacing: 1px; text-transform: uppercase;
          color: var(--green); min-width: 60px; margin-top: 3px;
        }
        .ms-title { font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 2px; }
        .ms-desc { font-size: 12px; color: var(--ink3); line-height: 1.5; }

        /* ─── SLIDE 12: CLOSE ─── */
        #s12 {
          background: var(--ink);
          align-items: center;
          text-align: center;
          padding: 60px 40px;
        }
        #s12::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 900px 700px at 50% 50%, rgba(30, 92, 48, .3) 0%, transparent 70%);
        }

        .close-pre {
          position: relative; z-index: 1;
          font-family: var(--fc); font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
          color: rgba(255, 255, 255, .3); margin-bottom: 24px;
        }
        .close-h {
          position: relative; z-index: 1;
          font-family: var(--fh);
          font-size: clamp(40px, 6vw, 72px);
          font-weight: 900; font-style: italic;
          line-height: 1.05; letter-spacing: -2px;
          color: white; margin-bottom: 12px;
        }
        .close-h span { color: var(--green3); }
        .close-sub {
          position: relative; z-index: 1;
          font-size: 16px; color: rgba(255, 255, 255, .5);
          max-width: 480px; margin: 0 auto 48px; line-height: 1.6;
        }
        .close-contact {
          position: relative; z-index: 1;
          display: flex; flex-direction: column; gap: 6px; align-items: center;
        }
        .cc { font-size: 13px; color: rgba(255, 255, 255, .4); }
        .cc strong { color: rgba(255, 255, 255, .75); font-weight: 500; }

        /* scroll hint */
        .scroll-hint {
          position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          font-family: var(--fc); font-size: 10px; letter-spacing: 2px; color: rgba(255, 255, 255, .2);
          animation: hint 3s ease-in-out infinite;
        }
        @keyframes hint {
          0%, 100% { opacity: .4; transform: translateX(-50%) translateY(0) }
          50% { opacity: .8; transform: translateX(-50%) translateY(4px) }
        }
        .scroll-hint-arrow { font-size: 16px; }

        /* animation on scroll */
        .fade-in { opacity: 0; transform: translateY(20px); transition: opacity .7s ease, transform .7s ease; }
        .fade-in.visible { opacity: 1; transform: translateY(0); }
      ` }} />

      {/* FLOATING ACTION LOGO & LINK TO SCANNER */}
      <div className="fixed left-7 top-7 z-[100] flex items-center gap-3">
        <span className="font-serif font-black text-white text-lg tracking-tight select-none">
          Scan<span className="text-[#2e8046]">Safe</span>
        </span>
        <Link 
          href="/scan" 
          className="bg-[#2e8046] hover:bg-[#236b38] text-white text-[10px] font-bold px-3 py-1.5 rounded-full tracking-wider uppercase transition shadow-md shadow-emerald-950/20"
        >
          Try Scanner App →
        </Link>
      </div>

      {/* NAV DOTS */}
      <div className="nav">
        {slideIds.map((id, index) => (
          <button
            key={id}
            className={`nav-dot ${activeSlide === id ? 'active' : ''}`}
            onClick={() => goTo(id)}
            title={`Slide ${index + 1}`}
          />
        ))}
      </div>

      {/* SLIDE 1: COVER */}
      <section className="slide" id="s1">
        <div className="cover-tag">Google for Startups · Antigravity Program · 2025</div>
        <div className="cover-logo">Scan<span>Safe</span></div>
        <div className="cover-tagline">India scans food. AI tells the truth.</div>

        <div className="cover-stats">
          <div className="cs">
            <span className="cs-n">₹7,000 Cr</span>
            <span className="cs-l">India market by 2030</span>
          </div>
          <div className="cs">
            <span className="cs-n">800M</span>
            <span className="cs-l">Indian smartphone users</span>
          </div>
          <div className="cs">
            <span className="cs-n">₹0</span>
            <span className="cs-l">India-first AI scanner exists today</span>
          </div>
          <div className="cs">
            <span className="cs-n">$20M</span>
            <span className="cs-l">Yuka revenue (proof it works)</span>
          </div>
        </div>

        <div className="cover-bottom">
          <span>Kirtan Patel</span>
          <span>·</span>
          <span>GH Patel College of Engineering, CVMU · Anand, Gujarat</span>
          <span>·</span>
          <Link href="/scan" className="hover:text-white transition">scansafe.in</Link>
        </div>

        <div className="scroll-hint">
          <span>scroll through</span>
          <span className="scroll-hint-arrow">↓</span>
        </div>
        <div className="slide-num">01 / 12</div>
      </section>

      {/* SLIDE 2: PROBLEM */}
      <section className="slide" id="s2">
        <div className="slide-eyebrow">The Problem</div>
        <div className="slide-h fade-in">800 million Indians eat <em>blindly.</em></div>

        <div className="problem-grid fade-in">
          <div className="prob-card" data-n="1">
            <span className="prob-icon">📦</span>
            <div className="prob-title">Labels are unreadable</div>
            <div className="prob-desc">The average Indian packaged food label has 40+ ingredients in 6pt font. 92% of consumers admit they never read the full list.</div>
            <span className="prob-stat">92% don't read labels</span>
          </div>
          <div className="prob-card" data-n="2">
            <span className="prob-icon">🩺</span>
            <div className="prob-title">Chronic disease crisis</div>
            <div className="prob-desc">India has 101 million diabetics, 220 million hypertensive patients. Packaged food additives directly worsen these conditions — but no tool warns them.</div>
            <span className="prob-stat">101M diabetics in India</span>
          </div>
          <div className="prob-card" data-n="3">
            <span className="prob-icon">🇮🇳</span>
            <div className="prob-title">FSSAI violations ignored</div>
            <div className="prob-desc">Potassium Bromate (banned in India since 2016) still found in Indian bread. Trans fat violations common. No consumer tool checks FSSAI compliance.</div>
            <span className="prob-stat">₹0 India FSSAI tool exists</span>
          </div>
          <div className="prob-card" data-n="4">
            <span className="prob-icon">🌍</span>
            <div className="prob-title">Global apps fail India</div>
            <div className="prob-desc">Yuka has 73M users globally — but no Hindi UI, no FSSAI layer, no Indian product database, no personalisation for Indian dietary conditions like Jain diet or diabetic needs.</div>
            <span className="prob-stat">Zero India-first solution</span>
          </div>
        </div>
        <div className="slide-num">02 / 12</div>
      </section>

      {/* SLIDE 3: SOLUTION */}
      <section className="slide" id="s3">
        <div className="slide-eyebrow">The Solution</div>
        <div className="slide-h fade-in">One photo. Complete truth.</div>

        <div className="solution-split fade-in">
          <div className="solution-flow">
            <div className="flow-step">
              <div className="flow-num">1</div>
              <div className="flow-body">
                <div className="flow-title">Snap any product photo</div>
                <div className="flow-desc">No barcode required. Works on damaged labels, imported products, homemade packages. Claude Vision reads it all.</div>
              </div>
            </div>
            <div className="flow-step">
              <div className="flow-num">2</div>
              <div className="flow-body">
                <div className="flow-title">AI reads every ingredient</div>
                <div className="flow-desc">Claude Vision + our proprietary FSSAI database decodes nutrition per 100g, every additive E-number, all 8 allergens.</div>
              </div>
            </div>
            <div className="flow-step">
              <div className="flow-num">3</div>
              <div className="flow-body">
                <div className="flow-title">Personalised for your body</div>
                <div className="flow-desc">Diabetic, gym, pregnant, Jain, child, elderly — score and verdict adjust entirely. Not one size fits all.</div>
              </div>
            </div>
            <div className="flow-step">
              <div className="flow-num">4</div>
              <div className="flow-body">
                <div className="flow-title">Verdict in your language</div>
                <div className="flow-desc">English, हिंदी, ગુજરાતી. Plain words, no medical jargon. Context-aware — dose and frequency, not just "harmful".</div>
              </div>
            </div>
          </div>

          <div className="solution-moats">
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: '8px' }}>Our 3 Unfair Advantages</div>
            <div className="moat">
              <span className="moat-badge">Moat 1</span>
              <span className="moat-text"><strong>Photo scan without barcode.</strong> Yuka can't do this. We work on any label in any condition.</span>
            </div>
            <div className="moat">
              <span className="moat-badge">Moat 2</span>
              <span className="moat-text"><strong>FSSAI India compliance layer.</strong> First product ever to automatically flag Indian food law violations. No competitor has this.</span>
            </div>
            <div className="moat">
              <span className="moat-badge">Moat 3</span>
              <span className="moat-text"><strong>Personalised scoring for India.</strong> Diabetic users, Jain users, gym users — all get different scores for the same product.</span>
            </div>
          </div>
        </div>
        <div className="slide-num">03 / 12</div>
      </section>

      {/* SLIDE 4: MARKET */}
      <section className="slide" id="s4">
        <div className="slide-eyebrow">Market Size</div>
        <div className="slide-h fade-in">A market that <em>grows itself.</em></div>

        <div className="market-layout fade-in">
          <div className="tam-stack">
            <div className="tam-ring tam-t">
              <div><div className="tam-label">TAM — Global food scanner market</div><div className="tam-sub">All food safety + nutrition apps worldwide</div></div>
              <div><div className="tam-val">$3B</div><div className="tam-unit">by 2035</div></div>
            </div>
            <div className="tam-ring tam-s">
              <div><div className="tam-label">SAM — India diet + health apps</div><div className="tam-sub">₹900–₹1,200 Cr today → ₹22,000 Cr by 2030</div></div>
              <div><div className="tam-val">₹22,000 Cr</div><div className="tam-unit">India 2030</div></div>
            </div>
            <div className="tam-ring tam-so">
              <div><div className="tam-label">SOM — Our beachhead (Year 1-2)</div><div className="tam-sub">Urban India health-conscious 25-45 yr, paying ₹99/mo</div></div>
              <div><div className="tam-val">₹300 Cr</div><div className="tam-unit">reachable</div></div>
            </div>
          </div>

          <div className="market-facts">
            <div className="mf">
              <div className="mf-stat">3×</div>
              <div className="mf-label">Jump in "calorie tracking" Google searches in India since 2019. Lockdown permanently changed food awareness.</div>
            </div>
            <div className="mf">
              <div className="mf-stat">75%</div>
              <div className="mf-label">Urban Indian millennials "trying to eat healthier" — but no tool serves them in Hindi.</div>
            </div>
            <div className="mf">
              <div className="mf-stat">101M</div>
              <div className="mf-label">Diabetics in India — all need a personalised food scanner. This is one user segment alone.</div>
            </div>
            <div className="mf">
              <div className="mf-stat">15-20%</div>
              <div className="mf-label">CAGR for Indian diet apps. Fastest-growing digital health vertical in India.</div>
            </div>
          </div>
        </div>
        <div className="slide-num">04 / 12</div>
      </section>

      {/* SLIDE 5: COMPETITION */}
      <section className="slide" id="s5">
        <div className="slide-eyebrow">Competitive Landscape</div>
        <div className="slide-h fade-in">We do what <em>they cannot.</em></div>

        <div className="fade-in overflow-x-auto w-full">
          <table className="comp-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Yuka (France)</th>
                <th>FactsScan (India)</th>
                <th>Eat This (US)</th>
                <th className="you-col">ScanSafe ✦</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Photo scan — no barcode needed</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="you-col you-tick">✓</td>
              </tr>
              <tr>
                <td>FSSAI India compliance check</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="you-col you-tick">✓</td>
              </tr>
              <tr>
                <td>Personalised score (diabetic, Jain, gym…)</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="you-col you-tick">✓</td>
              </tr>
              <tr>
                <td>Hindi + Gujarati UI + verdict</td>
                <td className="no-cross">✗</td>
                <td>Partial</td>
                <td className="no-cross">✗</td>
                <td className="you-col you-tick">✓</td>
              </tr>
              <tr>
                <td>Context-aware scoring (dose + frequency)</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="you-col you-tick">✓</td>
              </tr>
              <tr>
                <td>Web app (no install required)</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="you-col you-tick">✓</td>
              </tr>
              <tr>
                <td>AI vision analysis (Claude/Gemini)</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="no-cross">✗</td>
                <td className="you-col you-tick">✓</td>
              </tr>
              <tr>
                <td>India pricing (₹99/mo)</td>
                <td>$2.99/mo</td>
                <td>Free only</td>
                <td>$4.99/mo</td>
                <td className="you-col you-tick">₹99/mo</td>
              </tr>
              <tr>
                <td>Barcode scan</td>
                <td className="yes-tick">✓</td>
                <td className="yes-tick">✓</td>
                <td className="yes-tick">✓</td>
                <td className="you-col you-tick">✓ (Phase 2)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="slide-num">05 / 12</div>
      </section>

      {/* SLIDE 6: TRACTION PROOF */}
      <section className="slide" id="s6">
        <div className="slide-eyebrow">Market Validation</div>
        <div className="slide-h fade-in">Yuka proved the model. <em>We own India.</em></div>

        <div className="proof-quote fade-in">
          <div className="pq-text">"94% of Yuka users stopped purchasing products flagged for containing dangerous additives after using the app."</div>
          <div className="pq-src">— Sustainable Brands 2024 Impact Study</div>
        </div>

        <div className="traction-grid fade-in">
          <div className="tr-card">
            <div className="tr-n">$20.3M</div>
            <div className="tr-l">Yuka annual revenue 2023 — from subscriptions only, zero ads, zero brand deals</div>
            <div className="tr-src">SOURCE: GETLATKA / YUKA.IO</div>
          </div>
          <div className="tr-card">
            <div className="tr-n">73M</div>
            <div className="tr-l">Yuka users worldwide — built with just $928K in funding. Word-of-mouth only.</div>
            <div className="tr-src">SOURCE: DEALROOM.CO 2026</div>
          </div>
          <div className="tr-card">
            <div className="tr-n">₹0</div>
            <div className="tr-l">Spent on marketing by Yuka in first 5 years. Pure organic growth. ScanSafe will replicate via WhatsApp virality.</div>
            <div className="tr-src">SOURCE: YUKA.IO INDEPENDENCE PAGE</div>
          </div>
        </div>

        <div className="yuka-proof fade-in">
          <div className="yp">
            <div className="yp-n">15 → 236</div>
            <div className="yp-l">Yuka employees growth (still small team)</div>
          </div>
          <div className="yp">
            <div className="yp-n">$928K</div>
            <div className="yp-l">Total funding raised to reach $20M revenue</div>
          </div>
          <div className="yp">
            <div className="yp-n">5 years</div>
            <div className="yp-l">To profitability — zero ad spend</div>
          </div>
          <div className="yp">
            <div className="yp-n">India gap</div>
            <div className="yp-l">Yuka has no FSSAI, no Hindi, no Indian DB</div>
          </div>
        </div>
        <div className="slide-num">06 / 12</div>
      </section>

      {/* SLIDE 7: PRODUCT */}
      <section className="slide" id="s7">
        <div className="slide-eyebrow">Product</div>
        <div className="slide-h fade-in">Built different. <em>Defensibly.</em></div>

        <div className="product-split fade-in">
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '14px' }}>Feature Roadmap</div>
            <div className="feature-list">
              <div className="feat-item">
                <span className="feat-badge fb-now">Live</span>
                <div className="feat-info">
                  <div className="feat-name">AI Photo Scan (no barcode)</div>
                  <div className="feat-why">Claude/Gemini Vision reads any label. Per-100g nutrition, every ingredient rated, FSSAI flags, Hindi verdict, shareable cards.</div>
                </div>
              </div>
              <div className="feat-item">
                <span className="feat-badge fb-now">Live</span>
                <div className="feat-info">
                  <div className="feat-name">Personalised Health Profile</div>
                  <div className="feat-why">Diabetic, gym, Jain, pregnant, elderly — score recalibrates. Family multi-profile. ₹199/month family plan.</div>
                </div>
              </div>
              <div className="feat-item">
                <span className="feat-badge fb-now">Live</span>
                <div className="feat-info">
                  <div className="feat-name">FSSAI Compliance Layer</div>
                  <div className="feat-why">Flags Potassium Bromate, trans fat &gt;2%, Sudan dyes, banned colours. First product in India to do this.</div>
                </div>
              </div>
              <div className="feat-item">
                <span className="feat-badge fb-q2">Q2 2025</span>
                <div className="feat-info">
                  <div className="feat-name">Barcode + Open Food Facts</div>
                  <div className="feat-why">Hybrid: barcode → OFF database → Claude deep analysis. 3x faster, 60% lower API cost per scan.</div>
                </div>
              </div>
              <div className="feat-item">
                <span className="feat-badge fb-q3">Q3 2025</span>
                <div className="feat-info">
                  <div className="feat-name">React Native App (iOS + Android)</div>
                  <div className="feat-why">Full mobile app after web validation. Reuse 80% of web logic. Native camera for instant scan.</div>
                </div>
              </div>
              <div className="feat-item">
                <span className="feat-badge fb-q3">Q4 2025</span>
                <div className="feat-info">
                  <div className="feat-name">B2B — Gyms + Dietitians</div>
                  <div className="feat-why">White-label ScanSafe for gyms and hospitals. ₹2,999/month per client. 10 clients = ₹30,000 MRR.</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="stack-visual">
              <div className="stack-title">Tech Stack</div>
              <div className="stack-row"><span className="stack-layer">Frontend</span><span className="stack-tech">Next.js 16 + Tailwind</span></div>
              <div className="stack-row"><span className="stack-layer">AI Vision</span><span className="stack-tech">Gemini 2.5 Flash / Claude</span></div>
              <div className="stack-row"><span className="stack-layer">Database</span><span className="stack-tech">Supabase (Postgres)</span></div>
              <div className="stack-row"><span className="stack-layer">Auth</span><span className="stack-tech">Supabase Auth + Google</span></div>
              <div className="stack-row"><span className="stack-layer">Payments</span><span className="stack-tech">Razorpay Subscriptions</span></div>
              <div className="stack-row"><span className="stack-layer">Hosting</span><span className="stack-tech">Vercel Edge Network</span></div>
              <div className="stack-row"><span className="stack-layer">Food DB</span><span className="stack-tech">Open Food Facts API</span></div>
              <div className="stack-row"><span className="stack-layer">Mobile</span><span className="stack-tech">React Native (Q3)</span></div>
            </div>

            <div style={{ marginTop: '16px', background: 'var(--green-pale)', border: '1px solid var(--green-light)', borderRadius: '14px', padding: '16px 18px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '8px' }}>Why Gemini + Claude over GPT-4V</div>
              <div style={{ fontSize: '12px', color: 'var(--ink3)', lineHeight: '1.6' }}>Gemini and Claude excel at structured JSON from images — consistently returning complete, parseable analysis. Better for damaged/partial labels. Longer context for complex ingredient lists. Constitutional AI alignment = safer health recommendations.</div>
            </div>
          </div>
        </div>
        <div className="slide-num">07 / 12</div>
      </section>

      {/* SLIDE 8: BUSINESS MODEL */}
      <section className="slide" id="s8">
        <div className="slide-eyebrow">Business Model</div>
        <div className="slide-h fade-in">Break-even at <em>9 users.</em></div>

        <div className="biz-layout fade-in">
          <div>
            <div style={{ fontFamily: 'var(--fc)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: '14px' }}>Subscription Plans</div>
            <div className="plan-cards">
              <div className="plan">
                <div><div className="plan-name">Free</div><div className="plan-desc">5 scans/day · basic analysis</div></div>
                <div className="plan-price"><div className="plan-num" style={{ color: 'rgba(255,255,255,.4)' }}>₹0</div></div>
              </div>
              <div className="plan featured">
                <div><div className="plan-name">Pro ⭐</div><div className="plan-desc">Unlimited · history · Hindi · allergen profile</div></div>
                <div className="plan-price"><div className="plan-num">₹99</div><span className="plan-period">/month</span></div>
              </div>
              <div className="plan">
                <div><div className="plan-name">Annual Pro</div><div className="plan-desc">2 months free · same features</div></div>
                <div className="plan-price"><div className="plan-num">₹799</div><span className="plan-period">/year</span></div>
              </div>
              <div className="plan">
                <div><div className="plan-name">Family</div><div className="plan-desc">5 profiles · all features</div></div>
                <div className="plan-price"><div className="plan-num">₹199</div><span className="plan-period">/month</span></div>
              </div>
              <div className="plan">
                <div><div className="plan-name">B2B Gym / Clinic</div><div className="plan-desc">White-label · API access</div></div>
                <div className="plan-price"><div className="plan-num">₹2,999</div><span className="plan-period">/month</span></div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--fc)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: '14px' }}>Unit Economics (1 Pro User)</div>
            <div className="unit-econ">
              <div className="ue-row"><span className="ue-label">Monthly Revenue</span><span className="ue-val pos">₹99</span></div>
              <div className="ue-row"><span className="ue-label">Claude/Gemini API cost (~50 scans/mo)</span><span className="ue-val neg">-₹10</span></div>
              <div className="ue-row"><span className="ue-label">Infra share (Vercel + Supabase)</span><span className="ue-val neg">-₹9</span></div>
              <div className="ue-row"><span className="ue-label">Razorpay 2%</span><span className="ue-val neg">-₹2</span></div>
              <div className="ue-row" style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '12px' }}><span className="ue-label" style={{ fontWeight: '600', color: 'rgba(255,255,255,.8)' }}>Net Margin per user</span><span className="ue-val pos">~₹78</span></div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', lineHeight: '1.5', marginTop: '8px' }}>
                Note: Since integrating the free Google Gemini tier, our margin improves to <strong style={{ color: 'var(--green3)' }}>₹78 per user</strong>. API cost falls as scale increases.
              </div>
            </div>
          </div>

          <div className="projections">
            <div className="proj-cell">
              <div className="proj-mo">M3</div>
              <div className="proj-users">100</div>
              <div className="proj-mrr">₹9,900 MRR</div>
            </div>
            <div className="proj-cell">
              <div className="proj-mo">M6</div>
              <div className="proj-users">500</div>
              <div className="proj-mrr">₹49,500 MRR</div>
            </div>
            <div className="proj-cell">
              <div className="proj-mo">M9</div>
              <div className="proj-users">2,000</div>
              <div className="proj-mrr">₹1.98L MRR</div>
            </div>
            <div className="proj-cell">
              <div className="proj-mo">M12</div>
              <div className="proj-users">5,000</div>
              <div className="proj-mrr">₹4.95L MRR</div>
            </div>
            <div className="proj-cell">
              <div className="proj-mo">M18</div>
              <div className="proj-users">15,000</div>
              <div className="proj-mrr">₹14.85L MRR</div>
            </div>
          </div>
        </div>
        <div className="slide-num">08 / 12</div>
      </section>

      {/* SLIDE 9: WHY NOW */}
      <section className="slide" id="s9">
        <div className="slide-eyebrow">Why Now</div>
        <div className="slide-h fade-in">5 tailwinds are <em>converging.</em></div>

        <div className="why-grid fade-in">
          <div className="why-card">
            <div className="why-stat">3×</div>
            <div className="why-label">Food health searches surged post-COVID</div>
            <div className="why-desc">Lockdown permanently changed Indian food awareness. "What's in my food" Google searches tripled since 2019.</div>
          </div>
          <div className="why-card">
            <div className="why-stat">FSSAI 2022</div>
            <div className="why-label">Trans fat ban created demand</div>
            <div className="why-desc">FSSAI banned trans fat &gt;2% in 2022 — but zero consumer tool checks compliance. Massive media coverage creates category awareness.</div>
          </div>
          <div className="why-card">
            <div className="why-stat">Vision AI</div>
            <div className="why-label">Vision AI now good enough</div>
            <div className="why-desc">Gemini/Claude Vision reads partial labels, estimates nutrition from product type, returns structured JSON reliably. Wasn't possible in 2022.</div>
          </div>
          <div className="why-card">
            <div className="why-stat">UPI + Razorpay</div>
            <div className="why-label">India's payment infrastructure ready</div>
            <div className="why-desc">₹99/month subscription via UPI is frictionless for Indian users. Razorpay handles recurring billing natively. Wasn't this smooth 3 years ago.</div>
          </div>
          <div className="why-card">
            <div className="why-stat">800M</div>
            <div className="why-label">Smartphone users, still growing</div>
            <div className="why-desc">India adds 50M new smartphone users per year. Tier-2/3 cities (Anand, Surat, Rajkot) becoming digital-first. Hindi UI captures this wave.</div>
          </div>
          <div className="why-card">
            <div className="why-stat">₹0</div>
            <div className="why-label">Real competition in India today</div>
            <div className="why-desc">FactsScan exists but no AI vision, no personalisation, no FSSAI layer. Yuka ignores India. The window is wide open — right now.</div>
          </div>
        </div>

        <div className="india-bar fade-in">
          <div className="india-flag">🇮🇳</div>
          <div>
            <div className="india-title">The Gujarat + India advantage</div>
            <div className="india-desc">Kirtan is building from Anand, Gujarat — the same region that produced Amul, Zydus, Torrent. Deep understanding of Indian dietary habits, Jain restrictions, FSSAI rules. iCreate Gujarat offers up to ₹50 lakh for deep-tech AI startups from Gujarat. CVMU network = 10,000+ potential early users in colleges alone.</div>
          </div>
        </div>
        <div className="slide-num">09 / 12</div>
      </section>

      {/* SLIDE 10: TEAM */}
      <section className="slide" id="s10">
        <div className="slide-eyebrow">Team</div>
        <div className="slide-h fade-in">Built by someone who <em>lives this problem.</em></div>

        <div className="team-layout fade-in">
          <div className="founder-card">
            <div className="founder-avatar">👨‍💻</div>
            <div className="founder-name">Kirtan Patel</div>
            <div className="founder-title">Founder & CEO · Builder</div>
            <div className="founder-points">
              <div className="fp">Computer Engineering student, GH Patel College of Engineering (CVMU), Anand, Gujarat</div>
              <div className="fp">Built ScanSafe end-to-end: Next.js + Claude/Gemini Vision + Supabase + Razorpay — solo, in 2 weeks</div>
              <div className="fp">Previous builds: JARVIS AI assistant (voice + vision), Wandr AI travel planner (full SaaS stack), YouTube automation agent with OAuth2</div>
              <div className="fp">Deep knowledge of Indian food culture, Jain diet, FSSAI compliance from Gujarat context</div>
              <div className="fp">Active options trader (TCS calls, Groww) — understands unit economics, risk/reward thinking</div>
              <div className="fp">Studying Computer Engineering + building products = rare combination of theory + execution</div>
            </div>
          </div>

          <div className="founder-card">
            <div className="founder-avatar">🔍</div>
            <div className="founder-name">Looking for Co-founder</div>
            <div className="founder-title">Target: Growth / GTM Lead</div>
            <div className="founder-points">
              <div className="fp">Ideal profile: nutrition/dietetics background OR marketing background with health focus</div>
              <div className="fp">Would own: Hindi content, dietitian partnerships, B2B gym outreach</div>
              <div className="fp">India health influencer connections for organic growth</div>
              <div className="fp">Strong preference: Gujarat-based, understands Indian tier-2 market</div>
              <div className="fp">Equity: 15-25% depending on experience and commitment</div>
            </div>
          </div>

          <div className="advisor-row">
            <div className="adv-title">Support Network + Grants Available</div>
            <div className="adv-chips">
              <div className="adv-chip">iCreate Gujarat — up to ₹50L grant for AI startups</div>
              <div className="adv-chip">MeitY GENESIS — ₹10L non-refundable for DPIIT startups</div>
              <div className="adv-chip">Startup India Seed Fund</div>
              <div className="adv-chip">CVMU Incubation Cell</div>
              <div className="adv-chip">Google for Startups — Antigravity infra</div>
              <div className="adv-chip">Antler India — early-stage VC</div>
            </div>
          </div>
        </div>
        <div className="slide-num">10 / 12</div>
      </section>

      {/* SLIDE 11: ASK */}
      <section className="slide" id="s11">
        <div className="slide-eyebrow">The Ask & Milestones</div>
        <div className="slide-h">Fueling the next phase of ScanSafe.</div>

        <div className="ask-layout">
          <div>
            <div style={{ fontFamily: 'var(--fc)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '14px' }}>Use of Funds</div>
            <div className="use-of-funds">
              <div className="uof">
                <div className="uof-pct">40%</div>
                <div className="uof-body">
                  <div className="uof-title">Engineering & AI Costs</div>
                  <div className="uof-desc">AI Vision API credits, server hosting, backend optimization, and React Native mobile development.</div>
                </div>
              </div>
              <div className="uof">
                <div className="uof-pct">35%</div>
                <div className="uof-body">
                  <div className="uof-title">Product & GTM Marketing</div>
                  <div className="uof-desc">Colleges partnership outreach, health influencers program, fitness gym white-label onboarding.</div>
                </div>
              </div>
              <div className="uof">
                <div className="uof-pct">25%</div>
                <div className="uof-body">
                  <div className="uof-title">Operations & Legals</div>
                  <div className="uof-desc">FSSAI regulation parsing, dietary safety audits database expansion, general operations.</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--fc)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '14px' }}>Milestones</div>
            <div className="milestones">
              <div className="ms">
                <div className="ms-time">M3</div>
                <div className="ms-body">
                  <div className="ms-title">1,000 Active Scanners</div>
                  <div className="ms-desc">Onboard colleges in Anand/Gujarat, validate organic viral loop.</div>
                </div>
              </div>
              <div className="ms">
                <div className="ms-time">M6</div>
                <div className="ms-body">
                  <div className="ms-title">App Store Release</div>
                  <div className="ms-desc">Launch Android & iOS native apps, activate Razorpay subscriptions.</div>
                </div>
              </div>
              <div className="ms">
                <div className="ms-time">M12</div>
                <div className="ms-body">
                  <div className="ms-title">5,000 Paid Pro Users</div>
                  <div className="ms-desc">Reach ₹5 Lakh MRR, sign first 10 gyms/dietitian clients.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="slide-num">11 / 12</div>
      </section>

      {/* SLIDE 12: CLOSE */}
      <section className="slide" id="s12">
        <div className="close-pre">Google for Startups · Antigravity Program · 2025</div>
        <div className="close-h">Scan<span>Safe</span></div>
        <p className="close-sub">Let's make food safe. One label at a time.</p>
        <div className="close-contact">
          <div className="cc">Kirtan Patel</div>
          <div className="cc font-medium text-[#7a7a70]">GH Patel College of Engineering, CVMU · Anand, Gujarat</div>
          <div className="cc mt-2">Email: <strong>kirtanpatel2326@gmail.com</strong></div>
          <div className="cc">Website: <strong>scansafe.in</strong></div>
        </div>
        <div className="slide-num">12 / 12</div>
      </section>
    </div>
  )
}
