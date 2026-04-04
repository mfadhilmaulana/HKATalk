import React from 'react';
import { ChevronLeft, Mic, Radio, Video, VideoOff } from 'lucide-react';

export default function TalkScreen({ 
  channel, 
  onLeave, 
  participants, 
  activeSpeaker,
  activeFrame,
  isVideoEnabled,
  toggleVideo,
  localVideoRef,
  onStartPTT,
  onStopPTT,
  onSOS,
  isRecording
}) {

  return (
    <div className="talk-screen">
      <div className="zello-header">
        <button className="zello-header-back" onClick={onLeave}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{fontSize: '1.1rem'}}>{channel.toUpperCase()}</h1>
          <div className="subtitle">
            <Radio size={10} style={{marginRight: '2px'}} /> {participants.length} Active Nodes
          </div>
        </div>
        <div style={{width: '24px'}}></div>
      </div>

      <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        {/* Incoming PTT Video Feed */}
        {activeSpeaker && activeFrame ? (
          <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
             <img src={activeFrame} alt="Incoming video frame" style={{ width: '100%', maxWidth: '300px', borderRadius: '16px', border: '2px solid var(--accent)', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }} />
          </div>
        ) : (
          <div style={{ opacity: 0.3, textAlign: 'center' }}>
            <Radio size={80} style={{margin: '0 auto', display: 'block'}} />
            <br />
            Menunggu Komunikasi...
          </div>
        )}

        {/* Local Camera Preview (Tiny) */}
        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '80px', height: '100px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflow: 'hidden', border: isVideoEnabled ? '2px solid var(--accent-secondary)' : 'none' }}>
           <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: isVideoEnabled ? 'block' : 'none' }} />
           {!isVideoEnabled && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}><VideoOff size={20} color="gray" /></div>}
        </div>
      </div>

      <div className="ptt-area" style={{ position: 'relative' }}>

        {/* SOS Alarm Button */}
        <button 
          onClick={onSOS}
          style={{ position:'absolute', top: '10px', left: '20px', background: 'red', color: 'white', border: '2px solid darkred', borderRadius: '50%', width:'55px', height:'55px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(255,0,0,0.6)', cursor:'pointer', zIndex: 10, fontWeight: 'bold', fontSize: '0.9rem' }}>
          SOS
        </button>

        <button 
          onClick={toggleVideo}
          style={{ position:'absolute', top: '10px', right: '20px', background: isVideoEnabled ? 'var(--accent)' : 'white', color: isVideoEnabled ? 'white' : 'gray', border: '1px solid var(--border)', borderRadius: '50%', width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 10px rgba(0,0,0,0.1)', cursor:'pointer', zIndex: 10 }}>
          {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <div className="ptt-wrapper">
          {activeSpeaker && !isRecording && (
            <div className="receiving-indicator">
              MENERIMA: {activeSpeaker.toUpperCase()}
            </div>
          )}
          <button 
            className={`ptt-button ${isRecording ? 'active' : ''}`}
            onMouseDown={onStartPTT}
            onMouseUp={onStopPTT}
            onMouseLeave={onStopPTT}
            onTouchStart={(e) => { e.preventDefault(); onStartPTT(); }}
            onTouchEnd={(e) => { e.preventDefault(); onStopPTT(); }}
            onTouchCancel={(e) => { e.preventDefault(); onStopPTT(); }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Mic size={54} color={isRecording ? 'black' : 'white'} />
          </button>
        </div>
      </div>
    </div>
  );
}
