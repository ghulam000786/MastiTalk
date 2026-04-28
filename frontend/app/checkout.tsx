import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { C } from '../src/theme';

type OrderResp = {
  order_id: string; amount: number; currency: string;
  razorpay_key_id: string; pack: any; user: any;
};

export default function Checkout() {
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const { refresh } = useAuth();
  const [order, setOrder] = useState<OrderResp | null>(null);
  const [status, setStatus] = useState<'init' | 'ready' | 'success' | 'failed' | 'verifying'>('init');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const wvRef = useRef<WebView>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<OrderResp>('/payments/create-order', {
          method: 'POST',
          body: JSON.stringify({ pack_id: packId }),
        });
        setOrder(r); setStatus('ready');
      } catch (e: any) {
        setErrorMsg(e.message || 'Failed to create order');
        setStatus('failed');
      }
    })();
  }, [packId]);

  const html = order ? buildHtml(order) : '';

  const onMessage = async (ev: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(ev.nativeEvent.data);
      if (msg.type === 'paid') {
        setStatus('verifying');
        try {
          const r = await api<{ success: boolean; coins_added: number; balance: number }>(
            '/payments/verify',
            {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: msg.razorpay_order_id,
                razorpay_payment_id: msg.razorpay_payment_id,
                razorpay_signature: msg.razorpay_signature,
              }),
            }
          );
          await refresh();
          setStatus('success');
          Alert.alert(
            'Payment successful',
            `+${r.coins_added} coins added. New balance: ${r.balance}`,
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/match') }]
          );
        } catch (e: any) {
          setStatus('failed');
          setErrorMsg(e.message || 'Verification failed');
        }
      } else if (msg.type === 'failed') {
        setStatus('failed');
        setErrorMsg(msg.error || 'Payment failed');
      } else if (msg.type === 'dismissed') {
        router.back();
      }
    } catch {}
  };

  if (status === 'init') {
    return (
      <SafeAreaView style={s.wrap}><View style={s.center}>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={s.centerText}>Preparing secure checkout…</Text>
      </View></SafeAreaView>
    );
  }
  if (status === 'failed') {
    return (
      <SafeAreaView style={s.wrap}><View style={s.center}>
        <Ionicons name="alert-circle" size={48} color={C.danger} />
        <Text style={s.centerTitle}>Payment failed</Text>
        <Text style={s.centerText}>{errorMsg}</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} testID="checkout-close-btn">
          <Text style={s.backBtnText}>Close</Text>
        </TouchableOpacity>
      </View></SafeAreaView>
    );
  }
  if (status === 'success' || status === 'verifying') {
    return (
      <SafeAreaView style={s.wrap}><View style={s.center}>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={s.centerTitle}>{status === 'success' ? 'Payment successful' : 'Verifying payment…'}</Text>
      </View></SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={s.header} edges={['top']}>
        <TouchableOpacity style={s.headerBack} onPress={() => router.back()} testID="checkout-back-btn">
          <Ionicons name="close" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Secure Checkout</Text>
        <View style={{ width: 36 }} />
      </SafeAreaView>
      <WebView
        ref={wvRef}
        testID="razorpay-webview"
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        style={{ flex: 1, backgroundColor: C.bg }}
        startInLoadingState
        renderLoading={() => (
          <View style={s.center}><ActivityIndicator color={C.gold} size="large" /></View>
        )}
      />
    </View>
  );
}

function buildHtml(o: OrderResp): string {
  const safe = JSON.stringify(o).replace(/</g, '\\u003c');
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
  body{margin:0;background:#060A14;color:#fff;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
  .card{background:#0C1322;border:1px solid #1E293B;border-radius:20px;padding:24px;max-width:380px;width:100%;}
  h2{margin:0 0 6px;font-size:18px}
  p{margin:0;color:#A0ABC0;font-size:13px}
  .row{display:flex;justify-content:space-between;margin-top:16px;font-size:14px}
  .amount{color:#D4AF37;font-weight:700}
  button{width:100%;margin-top:20px;padding:14px;border-radius:14px;border:none;background:#D4AF37;color:#000;font-weight:700;font-size:15px;cursor:pointer}
  .spinner{display:inline-block;width:16px;height:16px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:8px}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head><body>
<div class="card">
  <h2>Complete your purchase</h2>
  <p>You are buying the ${o.pack.label} pack</p>
  <div class="row"><span>Coins</span><span>${o.pack.coins}</span></div>
  <div class="row"><span>Amount</span><span class="amount">₹${o.amount/100}</span></div>
  <button id="pay" onclick="openRzp()"><span class="spinner" id="sp" style="display:none"></span><span id="lbl">Pay now</span></button>
</div>
<script>
  var order = ${safe};
  function post(m){
    try{ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }catch(e){}
  }
  function openRzp(){
    document.getElementById('sp').style.display='inline-block';
    document.getElementById('lbl').innerText='Opening...';
    var options = {
      key: order.razorpay_key_id,
      amount: order.amount,
      currency: order.currency,
      name: 'Coin Connect',
      description: order.pack.label + ' pack - ' + order.pack.coins + ' coins',
      order_id: order.order_id,
      prefill: {
        name: order.user.name || '',
        email: order.user.email || '',
      },
      theme: { color: '#D4AF37' },
      handler: function (resp){
        post({type:'paid', razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature});
      },
      modal: {
        ondismiss: function(){
          document.getElementById('sp').style.display='none';
          document.getElementById('lbl').innerText='Pay now';
          post({type:'dismissed'});
        }
      }
    };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(resp){
      post({type:'failed', error: (resp && resp.error && resp.error.description) || 'Payment failed'});
    });
    rzp.open();
  }
  // auto open on load
  window.addEventListener('load', function(){ setTimeout(openRzp, 300); });
</script>
</body></html>`;
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomColor: C.border, borderBottomWidth: 1 },
  headerBack: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12, backgroundColor: C.bg },
  centerTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 8 },
  centerText: { color: C.textSecondary, fontSize: 14, textAlign: 'center' },
  backBtn: { marginTop: 20, backgroundColor: C.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#000', fontWeight: '700' },
});
