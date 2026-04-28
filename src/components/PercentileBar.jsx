import React, { useRef, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';

const QUIPS = [
  [1,   'quite possibly one of the worst in the world!'],
  [10,  'just terrible.'],
  [40,  'not very good.'],
  [60,  'boringly average.'],
  [90,  'actually pretty decent...'],
  [99,  'legit amazing!'],
  [Infinity, 'probably cheating :('],
];

const getQuip = (pct) => {
  if (Math.ceil(pct) === 69) return 'nice.';
  return QUIPS.find(([t]) => pct < t)[1];
};

const PercentileBar = ({ score, percentile }) => {
  const containerRef = useRef(null);
  const trackRef    = useRef(null);
  const bubbleRef   = useRef(null);
  const lineRef     = useRef(null);
  const indicatorRef = useRef(null);

  const hasScore = score !== '' && score !== undefined && score !== null;
  const pct = (percentile !== null && percentile !== undefined)
    ? Math.min(99, Math.max(1, Math.round(percentile)))
    : 0;

  const coverWidth = hasScore ? `${100 - pct}%` : '100%';
  const bubbleText = !hasScore ? '' :
    pct >= 50 ? `better than ${pct}% of players` : `worse than ${100 - pct}% of players`;
  const quipText = hasScore ? `You're ${getQuip(pct)}` : 'How good are you? Enter your score!';

  useLayoutEffect(() => {
    if (!hasScore || !trackRef.current || !bubbleRef.current) return;
    const track     = trackRef.current;
    const bubble    = bubbleRef.current;
    const container = containerRef.current;
    const trackRect     = track.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const trackW    = track.offsetWidth;
    const trackLeft = trackRect.left - containerRect.left;
    const trackTop  = trackRect.top  - containerRect.top;
    const scoreX    = (pct / 100) * trackW;
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const bubbleLeft = Math.min(Math.max(trackLeft + scoreX - bw / 2, 0), trackLeft + trackW - bw);
    const bubbleTop  = trackTop - bh - 10;
    bubble.style.left = `${bubbleLeft}px`;
    bubble.style.top  = `${bubbleTop}px`;
    const line = lineRef.current;
    line.style.left   = `${trackLeft + scoreX}px`;
    line.style.top    = `${bubbleTop + bh}px`;
    line.style.height = `${trackTop - bubbleTop - bh}px`;
    const ind = indicatorRef.current;
    ind.style.left   = `${trackLeft + scoreX - 1}px`;
    ind.style.top    = `${trackTop}px`;
    ind.style.height = `${trackRect.height}px`;
  }, [hasScore, pct]);

  return (
    <div className={`rv-pct-result${hasScore ? ' has-score' : ''}`} ref={containerRef}>
      <div className="rv-pct-bubble"    ref={bubbleRef}>{bubbleText}</div>
      <div className="rv-pct-line"      ref={lineRef} />
      <div className="rv-pct-track"     ref={trackRef}>
        <div className="rv-pct-cover" style={{ width: coverWidth }} />
      </div>
      <div className="rv-pct-indicator" ref={indicatorRef} />
      <div className="rv-pct-quip">{quipText}</div>
    </div>
  );
};

PercentileBar.propTypes = {
  score: PropTypes.any,
  percentile: PropTypes.number,
};

export default PercentileBar;
