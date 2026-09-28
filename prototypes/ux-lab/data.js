// Deliberately synthetic fixture. No data is fetched from a financial provider.
export const stocks = [
 ['NVDA','NVIDIA','ai',224.93,.22,[210,218],230,'10/02','#82b740'],
 ['MU','Micron Technology','memory',168.40,2.34,[155,160],178,'09/30','#76a9ec'],
 ['AMD','Advanced Micro Devices','ai',196.32,-1.28,[182,188],208,'09/30','#d3817b'],
 ['ORCL','Oracle','cloud',137.10,-1.75,[128,132],150,'10/07','#d77665'],
 ['META','Meta Platforms','platform',751.50,-3.33,[710,730],800,'10/02','#5e9fea'],
 ['MSFT','Microsoft','cloud',516.17,3.66,[490,500],535,'10/02','#7da9b3'],
 ['AVGO','Broadcom','ai',352.81,.70,[338,345],370,null,'#b187ce'],
 ['AAPL','Apple','platform',341.07,1.53,null,350,null,'#a4abb5'],
 ['TSM','Taiwan Semiconductor','ai',null,null,null,null,null,'#ce977b'],
].map(([ticker,name,sector,price,change,reference,resistance,eventDate,color])=>({ticker,name,sector:'data.sector.'+sector,price,change,reference,resistance,eventDate,color,summary:'data.'+ticker.toLowerCase()+'.summary',bull:'data.'+ticker.toLowerCase()+'.bull',bear:'data.'+ticker.toLowerCase()+'.bear',event:'data.'+ticker.toLowerCase()+'.event',updated:'2026-09-25'}));
export const stock = ticker => stocks.find(s=>s.ticker===ticker);
