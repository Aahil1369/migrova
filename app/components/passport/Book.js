'use client';

import { Fragment } from 'react';
import Guilloche from './parts/Guilloche';
import { PAGES } from './timeline';
import './passport.css';

// Page furniture drawn by the Book (decorative, aria-hidden): header microcopy + page number.
// Page components (Task 6) render only their content: <section> with an h2.
export const PAGE_CHROME = {
  notice: { head: ['NOTICE', 'MGV · JOURNEY BOOK'], num: '01' },
  data: { head: ['HOLDER DATA', 'TYPE P · MGV'], num: '02' },
  visas1: { head: ['VISAS', 'FIVE FREE TOOLS'], num: '03' },
  visas2: { head: ['VISAS · CONTINUED', '195 COUNTRIES'], num: '04' },
  entries: { head: ['ENTRIES', 'HOW IT WORKS'], num: '05' },
  sources: { head: ['OFFICIAL SOURCES', 'UV CHECKED'], num: '06' },
  travellers: { head: ['FELLOW TRAVELLERS', 'EXIT · ENTRY'], num: '07' },
  observations: { head: ['OBSERVATIONS', 'ENDORSEMENTS'], num: '08' },
};
const MICROPRINT = 'MGV · JOURNEY BOOK · SPECIMEN';

// [left, right] page indexes of the four open spreads (stack layout).
const SPREADS = [[1, 2], [3, 4], [5, 6], [7, 8]];

/**
 * One page face. `side`: 'front' (right-hand page), 'back' (left-hand page, rotated 180deg
 * in the 3D spread), or 'single' (notepad / lite / stack cover). Paper pages get the
 * guilloche, header, footer and gutter shade; the cover gets the leather. `dim` adds the
 * `[data-dim]` overlay PassportStage fades while the face turns.
 */
function Face({ id, index, side, dim = false, extra = null, children }) {
  const cover = id === 'cover';
  const chrome = PAGE_CHROME[id];
  return (
    <div className={`jb-face jb-face--${side} ${cover ? 'jb-leather' : 'jb-paper'}`} data-page={id}>
      {cover ? (
        <div className="jb-cover">{children}</div>
      ) : (
        <>
          <Guilloche seed={index} className="jb-guilloche" />
          <div className="jb-pg">
            {chrome ? (
              <div className="jb-pghead" aria-hidden="true">
                <span>{chrome.head[0]}</span>
                <span>{chrome.head[1]}</span>
              </div>
            ) : null}
            <div className="jb-pgbody">
              {children}
              {extra}
            </div>
          </div>
          {chrome ? (
            <div className="jb-pgfoot" aria-hidden="true">
              <span>{MICROPRINT}</span>
              <b>{chrome.num}</b>
            </div>
          ) : null}
        </>
      )}
      <span className="jb-shade" aria-hidden="true" />
      {dim ? <span className="jb-dim" data-dim="" aria-hidden="true" /> : null}
    </div>
  );
}

/** Fold-out flap on the sources page's outer edge (desktop spread only). */
function Flap({ flapRef, children }) {
  return (
    <div className="jb-flap-hinge">
      <div ref={flapRef} className="jb-flap">
        <div className="jb-face jb-face--front jb-paper" data-page="sources" data-flap="">
          <Guilloche seed="flap" className="jb-guilloche" />
          <div className="jb-flap-body">{children}</div>
          <span className="jb-shade" aria-hidden="true" />
        </div>
        <div className="jb-face jb-face--back jb-paper" aria-hidden="true">
          <Guilloche seed="flap-back" className="jb-guilloche" />
          <span className="jb-shade" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function Spread({ nodes, flap, refs }) {
  return (
    <div className="jb jb-spread">
      <div className="jb-scene">
        <div ref={refs?.book} className="jb-book">
          {[0, 1, 2, 3].map((leaf) => {
            const front = leaf * 2;
            const back = front + 1;
            return (
              <Fragment key={leaf}>
                <div ref={refs?.leaves?.[leaf]} className="jb-leaf" data-leaf={leaf}>
                  <Face id={PAGES[front]} index={front} side="front" dim>
                    {nodes[front]}
                  </Face>
                  {leaf === 3 ? <Flap flapRef={refs?.flap}>{flap}</Flap> : null}
                  <Face id={PAGES[back]} index={back} side="back" dim>
                    {nodes[back]}
                  </Face>
                </div>
                {leaf === 0 ? <div ref={refs?.light} className="jb-light" aria-hidden="true" /> : null}
              </Fragment>
            );
          })}
          <div className="jb-base">
            <Face id={PAGES[8]} index={8} side="front">
              {nodes[8]}
            </Face>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pad({ layout, nodes, flap, refs }) {
  return (
    <div className={`jb jb-${layout}`}>
      <div className="jb-pad">
        {PAGES.map((id, i) => (
          <div
            key={id}
            ref={refs?.pages?.[i]}
            className="jb-npage"
            data-index={i}
            style={{ '--i': i }}
          >
            <Face
              id={id}
              index={i}
              side="single"
              dim={layout === 'notepad'}
              extra={
                i === 6 && flap ? (
                  <div className="jb-flap-inline" data-flap="">
                    {flap}
                  </div>
                ) : null
              }
            >
              {nodes[i]}
            </Face>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stack({ nodes, flap }) {
  const extra = (i) => (i === 6 && flap ? <div className="jb-flap-inline">{flap}</div> : null);
  return (
    <div className="jb jb-stack">
      <div className="jb-card jb-card--cover">
        <Face id={PAGES[0]} index={0} side="single">
          {nodes[0]}
        </Face>
      </div>
      {SPREADS.map(([left, right]) => (
        <div className="jb-stack-spread" key={PAGES[left]}>
          <div className="jb-card jb-card--left">
            <Face id={PAGES[left]} index={left} side="back" extra={extra(left)}>
              {nodes[left]}
            </Face>
          </div>
          <div className="jb-card jb-card--right">
            <Face id={PAGES[right]} index={right} side="front" extra={extra(right)}>
              {nodes[right]}
            </Face>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The Journey Book. Presentational: renders the nine page nodes in PAGES order and exposes
 * DOM refs; it never reads scroll. PassportStage writes transforms/opacity to the refs.
 *
 * leaves: [{ id, front, back, flap? }] x4 — cover/notice, data/visas1, visas2/entries,
 *         sources/travellers (optional `flap` on leaves[3]: content for the UV fold-out)
 * base:   observations page node
 * layout: 'spread' (3D two-page book) | 'notepad' (phone, top-hinged pages) |
 *         'lite' (crossfading pages, no 3D) | 'stack' (reduced motion: cards in flow)
 * refs:   { book, leaves: [4], flap, light, pages: [9] } ref objects owned by the caller;
 *         refs a layout doesn't use stay null (spread: book/leaves/flap/light;
 *         notepad + lite: pages; stack: none).
 * Each page node is rendered exactly once per layout. Changing `layout` remounts the book,
 * so no inline style written for one layout survives into another.
 * Flap content: spread -> the fold-out `.jb-flap` (PassportStage swings it with flapStyle);
 * notepad / lite -> `.jb-flap-inline[data-flap]` laid over the sources page body (PassportStage
 * crossfades it in with pose.flap); stack -> `.jb-flap-inline` in flow below the page.
 */
export default function Book({ leaves, base, layout = 'spread', refs }) {
  const nodes = [];
  for (let i = 0; i < 4; i++) nodes.push(leaves?.[i]?.front ?? null, leaves?.[i]?.back ?? null);
  nodes.push(base ?? null);
  const flap = leaves?.[3]?.flap ?? null;

  if (layout === 'stack') return <Stack key="stack" nodes={nodes} flap={flap} />;
  if (layout === 'notepad' || layout === 'lite') {
    return <Pad key={layout} layout={layout} nodes={nodes} flap={flap} refs={refs} />;
  }
  return <Spread key="spread" nodes={nodes} flap={flap} refs={refs} />;
}
