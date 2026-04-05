import React from 'react';
import { ChevronLeft, Mic, Radio, Video, VideoOff, AlertTriangle } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';

export default function TalkScreen({ 
  channel, onLeave, participants, activeSpeaker,
  activeFrame, isVideoEnabled, toggleVideo, localVideoRef,
  onStartPTT, onStopPTT, onSOS, isRecording
}) {

  return (
    <div className="talk-screen">
      <div className="zello-header">
        <button className="zello-header-back" onClick={onLeave}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{fontSize: '0.95rem'}}>{(channel || '').toUpperCase()}</h1>
          <div className="subtitle">
            <Radio size={9} /> {participants.length} ACTIVE NODES
          </div>
        </div>
        <div style={{width: '34px'}} />
      </div>

      <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', gap: '0.5rem' }}>
        
        {/* Incoming PTT Video Feed */}
        {activeSpeaker && activeFrame ? (
          <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1}}>
             <img src={activeFrame} alt="Incoming video frame" style={{ width: '100%', maxWidth: '300px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-elevated)', imageRendering: 'auto', objectFit: 'cover' }} />
             <div style={{ marginTop: '6px', fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '4px' }}>
               <Video size={10} /> {activeSpeaker}
             </div>
          </div>
        ) : (
          <>
            {!isRecording && !activeSpeaker && (
              <div style={{ opacity: 0.15, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Radio size={72} style={{margin: '0 auto', display: 'block'}} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.02em' }}>Menunggu Komunikasi</div>
              </div>
            )}
          </>
        )}

        {/* Audio Visualizer */}
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <AudioVisualizer isRecording={isRecording} activeSpeaker={activeSpeaker} />
        </div>

        {/* Local Camera Preview */}
        <div style={{ position: 'absolute', top: '8px', right: '8px', width: '72px', height: '92px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: isVideoEnabled ? '2px solid var(--accent-secondary)' : '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
           <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: isVideoEnabled ? 'block' : 'none' }} />
           {!isVideoEnabled && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}><VideoOff size={18} color="var(--text-tertiary)" /></div>}
        </div>
      </div>

      <div className="ptt-area" style={{ position: 'relative' }}>

        {/* SOS */}
        <button 
          onClick={onSOS}
          style={{ position:'absolute', top: '10px', left: '16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '50%', width:'48px', height:'48px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(220,38,38,0.15)', cursor:'pointer', zIndex: 10, transition: 'transform 0.15s var(--ease-spring)' }}>
          <AlertTriangle size={18} />
        </button>

        <button 
          onClick={toggleVideo}
          style={{ position:'absolute', top: '10px', right: '16px', background: isVideoEnabled ? 'var(--accent-blue)' : 'var(--bg-tertiary)', color: isVideoEnabled ? 'white' : 'var(--text-tertiary)', border: '1px solid var(--border)', borderRadius: '50%', width:'48px', height:'48px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--shadow-xs)', cursor:'pointer', zIndex: 10, transition: 'all 0.2s var(--ease-out)' }}>
          {isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
        </button>

        <div className="ptt-wrapper">
          {activeSpeaker && !isRecording && (
            <div className="receiving-indicator">
              MENERIMA: {activeSpeaker.toUpperCase()}
            </div>
          )}
          <button 
            className={`ptt-button ${isRecording ? 'active' : ''}`}
            onMouseDown={onStartPTT} onMouseUp={onStopPTT} onMouseLeave={onStopPTT}
            onTouchStart={(e) => { e.preventDefault(); onStartPTT(); }}
            onTouchEnd={(e) => { e.preventDefault(); onStopPTT(); }}
            onTouchCancel={(e) => { e.preventDefault(); onStopPTT(); }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Mic size={48} color={isRecording ? '#111827' : 'white'} />
          </button>
        </div>
      </div>
    </div>
  );
}
