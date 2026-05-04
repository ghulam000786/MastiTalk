import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

// Conditionally require WebView on native only
let WebViewMod: any = null;
if (Platform.OS !== 'web') {
  try { WebViewMod = require('react-native-webview').WebView; } catch {}
}

type TokenResp = { token: string; app_id: string; channel: string; uid: number; expires_at: number; call_id: string };

export default function CallScreen() {
  const { channel } = useLocalSearchParams<{ channel: string }>();
  const { refresh } = useAuth();
  const [tokenData, setTokenData] = useState<TokenResp | null>(null);
  const [status, setStatus] = useState<'init' | 'connecting' | 'connected' | 'ending' | 'error'>('init');
  const [err, setErr] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState(0);
  const timerRef = useRef<any>(null);
  const endedRef = useRef(false);
  const wvRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<TokenResp>('/agora/token', {
          method: 'POST',
          body: JSON.stringify({ channel_name: channel, uid: 0 }),
        });
        setTokenData(r); setStatus('connecting');
      } catch (e: any) {
        setErr(e.message || 'Failed to get token'); setStatus('error');
      }
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [channel]);

  // Elapsed timer once connected
  useEffect(() => {
    if (status === 'connected' && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(v => v + 1), 1000);
    }
  }, [status]);

  const endCall = async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setStatus('ending');
    try { wvRef.current?.injectJavaScript(`try{window.leave && window.leave();}catch(e){} true;`); } catch {}
    const minutes = Math.max(0, Math.ceil(elapsed / 60));
    try {
      if (tokenData) {
        await api('/agora/end-call', {
          method: 'POST',
          body: JSON.stringify({ call_id: tokenData.call_id, minutes }),
        });
      }
    } catch {}
    await refresh();
    router.replace('/(tabs)/match');
  };

  const toggleMute = () => {
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.toggleMute?.(); } catch {}
    } else {
      wvRef.current?.injectJavaScript(`try{window.toggleMute && window.toggleMute();}catch(e){} true;`);
    }
  };
  const toggleCamera = () => {
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.toggleCamera?.(); } catch {}
    } else {
      wvRef.current?.injectJavaScript(`try{window.toggleCamera && window.toggleCamera();}catch(e){} true;`);
    }
  };

  const onMessage = (ev: any) => {
    try {
      const data = ev?.nativeEvent?.data ?? ev?.data;
      const msg = typeof data === 'string' ? JSON.parse(data) : data;
      if (msg.type === 'joined') setStatus('connected');
      else if (msg.type === 'remote-joined') setRemoteUsers(msg.count || 1);
      else if (msg.type === 'remote-left') setRemoteUsers(msg.count || 0);
      else if (msg.type === 'error') { setErr(msg.error || 'Call error'); setStatus('error'); }
    } catch {}
  };

  // On web, listen to postMessage from iframe
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object' || !e.data.__cc_call) return;
      onMessage({ data: e.data });
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Parse peer info from route params
  const params = useLocalSearchParams<{ channel: string; peer?: string }>();
  let peerInfo: any = null;
  try { peerInfo = params.peer ? JSON.parse(params.peer) : null; } catch {}

  const reportPeer = () => {
    if (!peerInfo?.id) {
      router.push('/report');
      return;
    }
    router.push({ pathname: '/report', params: { userId: peerInfo.id, name: peerInfo.name || '' } });
  };

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.wrap}><View style={styles.center}>
        <Ionicons name="videocam-off" size={48} color={C.danger} />
        <Text style={styles.errTitle}>Call failed</Text>
        <Text style={styles.errMsg}>{err}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="call-back-btn">
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View></SafeAreaView>
    );
  }

  const html = tokenData ? buildCallHtml(tokenData) : '';

  const renderCallSurface = () => {
    if (!tokenData) return null;
    if (Platform.OS === 'web') {
      // Use iframe with srcDoc to host Agora Web SDK
      const allow = 'camera; microphone; autoplay; encrypted-media';
      // @ts-ignore – render an HTML iframe element on web
      return React.createElement('iframe', {
        ref: iframeRef,
        srcDoc: html,
        allow,
        style: {
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          width: '100%', height: '100%', border: 'none',
          backgroundColor: '#060A14',
        },
        'data-testid': 'agora-iframe',
      });
    }
    if (!WebViewMod) return null;
    return (
      <WebViewMod
        ref={wvRef}
        testID="agora-webview"
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://webdemo.agora.io' }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        style={StyleSheet.absoluteFill}
      />
    );
  };

  return (
    <View style={styles.wrap}>
      {renderCallSurface()}

      {/* Top Bar */}
      <SafeAreaView pointerEvents="box-none" style={styles.topOverlay} edges={['top']}>
        <View style={styles.topBar}>
          <View style={styles.chBadge}>
            <View style={[styles.dot, { backgroundColor: status === 'connected' ? '#22C55E' : C.pink }]} />
            <Text style={styles.chBadgeText} testID="call-channel-text">
              {peerInfo?.name || channel}
            </Text>
          </View>
          <View style={styles.timerBadge}>
            <Ionicons name="time-outline" size={14} color={C.pink} />
            <Text style={styles.timerText} testID="call-timer">{fmt(elapsed)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.reportTop} onPress={reportPeer} testID="call-report-btn">
          <Ionicons name="flag" size={14} color="#fff" />
          <Text style={styles.reportTopText}>Report</Text>
        </TouchableOpacity>

        {status !== 'connected' && (
          <View style={styles.waiting}>
            <ActivityIndicator color={C.pink} size="large" />
            <Text style={styles.waitingText}>
              {status === 'connecting' ? 'Connecting…' :
               status === 'ending' ? 'Ending call…' : 'Preparing…'}
            </Text>
          </View>
        )}

        {status === 'connected' && remoteUsers === 0 && (
          <View style={styles.waiting}>
            <Text style={styles.waitingText}>Waiting for the other person…</Text>
            <Text style={styles.waitingSub}>Share channel name: {channel}</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView pointerEvents="box-none" style={styles.bottomOverlay} edges={['bottom']}>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={toggleMute} testID="call-mute-btn">
            <Ionicons name="mic" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.endBtn} onPress={endCall} testID="call-end-btn">
            <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={toggleCamera} testID="call-camera-btn">
            <Ionicons name="camera-reverse" size={24} color={C.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function buildCallHtml(t: { app_id: string; channel: string; token: string; uid: number }): string {
  const safe = JSON.stringify(t).replace(/</g, '\\u003c');
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  html,body{margin:0;padding:0;height:100%;background:#060A14;color:#fff;font-family:system-ui,sans-serif;overflow:hidden}
  #remote{position:absolute;inset:0;background:#060A14}
  #remote video{width:100%;height:100%;object-fit:cover}
  #local{position:absolute;bottom:120px;right:16px;width:110px;height:160px;border-radius:16px;overflow:hidden;border:2px solid rgba(212,175,55,0.5);background:#0C1322;z-index:5;box-shadow:0 8px 30px rgba(0,0,0,0.5)}
  #local video{width:100%;height:100%;object-fit:cover}
  .placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#64748B;font-size:14px}
</style>
<script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js"></script>
</head><body>
<div id="remote"><div class="placeholder" id="rplace">No remote video yet</div></div>
<div id="local"><div class="placeholder" style="font-size:11px">Starting camera…</div></div>
<script>
  var cfg = ${safe};
  var client = AgoraRTC.createClient({ mode:'rtc', codec:'vp8' });
  var localTracks = { audio:null, video:null };
  var muted = false, camOn = true;
  var remoteCount = 0;
  function post(m){
    try{
      m.__cc_call = true;
      if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
      else if(window.parent && window.parent !== window){ window.parent.postMessage(m, '*'); }
    }catch(e){}
  }

  client.on('user-published', async function(user, mediaType){
    try{
      await client.subscribe(user, mediaType);
      if(mediaType === 'video'){
        var rc = document.getElementById('remote');
        rc.innerHTML='';
        user.videoTrack.play(rc);
        remoteCount++;
        post({type:'remote-joined', count: remoteCount});
      }
      if(mediaType === 'audio'){
        user.audioTrack && user.audioTrack.play();
      }
    }catch(e){ post({type:'error', error:String(e)}); }
  });
  client.on('user-unpublished', function(user){
    remoteCount = Math.max(0, remoteCount-1);
    post({type:'remote-left', count: remoteCount});
    if(remoteCount===0){
      document.getElementById('remote').innerHTML='<div class="placeholder" id="rplace">Waiting for other user...</div>';
    }
  });

  async function join(){
    try{
      await client.join(cfg.app_id, cfg.channel, cfg.token, cfg.uid || null);
      try{
        localTracks.audio = await AgoraRTC.createMicrophoneAudioTrack();
      }catch(e){ post({type:'error', error:'Mic permission denied: '+e.message}); }
      try{
        localTracks.video = await AgoraRTC.createCameraVideoTrack();
        var lc = document.getElementById('local');
        lc.innerHTML='';
        localTracks.video.play(lc);
      }catch(e){ post({type:'error', error:'Camera permission denied: '+e.message}); }
      var pub=[];
      if(localTracks.audio) pub.push(localTracks.audio);
      if(localTracks.video) pub.push(localTracks.video);
      if(pub.length) await client.publish(pub);
      post({type:'joined'});
    }catch(e){
      post({type:'error', error:String(e && e.message || e)});
    }
  }

  window.toggleMute = function(){
    muted = !muted;
    if(localTracks.audio) localTracks.audio.setEnabled(!muted);
  };
  window.toggleCamera = function(){
    camOn = !camOn;
    if(localTracks.video) localTracks.video.setEnabled(camOn);
  };
  window.leave = async function(){
    try{
      if(localTracks.audio){ localTracks.audio.stop(); localTracks.audio.close(); }
      if(localTracks.video){ localTracks.video.stop(); localTracks.video.close(); }
      await client.leave();
    }catch(e){}
  };

  window.addEventListener('load', join);
</script>
</body></html>`;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#060A14' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 10, backgroundColor: '#060A14' },
  errTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginTop: 10 },
  errMsg: { color: '#A0ABC0', fontSize: 14, textAlign: 'center' },
  backBtn: { backgroundColor: C.pink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  backBtnText: { color: '#fff', fontWeight: '700' },

  topOverlay: { position: 'absolute', left: 0, right: 0, top: 0 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  chBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(12,19,34,0.85)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(12,19,34,0.85)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  timerText: { color: C.pink, fontWeight: '700', fontSize: 13 },

  waiting: { alignItems: 'center', marginTop: 24, gap: 8, paddingHorizontal: 24 },
  waitingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginTop: 8 },
  waitingSub: { color: '#A0ABC0', fontSize: 12 },

  bottomOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22, paddingVertical: 24 },
  ctrlBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(22,32,50,0.9)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  endBtn: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: C.danger,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.danger, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  reportTop: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginTop: 10, marginRight: 16,
    backgroundColor: 'rgba(239,68,68,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  reportTopText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
