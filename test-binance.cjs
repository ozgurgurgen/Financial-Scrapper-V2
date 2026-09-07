const axios = require('axios');
axios.get('https://api.binance.com/api/v3/ticker/24hr').then(res => {
  const all = res.data;
  const usdtPairs = all.filter(d => d.symbol.endsWith('USDT') && !d.symbol.includes('UPUSDT') && !d.symbol.includes('DOWNUSDT') && !d.symbol.includes('BULLUSDT') && !d.symbol.includes('BEARUSDT'));
  usdtPairs.sort((a,b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
  const top500 = usdtPairs.slice(0, 500);
  console.log("Found:", top500.length);
  console.log("Top 5:", top500.slice(0,5).map(c => c.symbol));
});
