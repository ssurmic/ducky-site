// Real local API accounts, watch mutations and CAS progress. Shared research is synthetic.
// Start bin/tests/trial_browser_server.py in the paired backend, build --trial-access,
// and serve dist on 127.0.0.1:8766 before running. No production traffic is permitted.
import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const openTour=process.env.QA_OPEN_ONBOARDING==='1';
const output=openTour?'reports/open-onboarding':'reports/trial-onboarding';await mkdir(output,{recursive:true});
const results=[];
for(const [engine,type] of Object.entries({chromium,webkit})){
 if(process.env.ENGINE&&engine!==process.env.ENGINE)continue;
 const browser=await type.launch();
 for(const width of [320,390,430,1440]){
  if(process.env.WIDTH&&width!==Number(process.env.WIDTH))continue;
  const lang=width===430?'zh':'en',copy=JSON.parse(readFileSync('i18n/'+lang+'.json')),txt=key=>copy['app.'+key];
  const label=engine+'-'+width+'-'+lang,errors=[],responses=[];
  const create=await fetch('http://127.0.0.1:8767/admin/qa/account',{method:'POST'});assert.equal(create.status,200);const account=await create.json();
  const height=width<700?660:1000;
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height},colorScheme:width===430?'dark':'light',reducedMotion:width===320?'reduce':'no-preference',storageState:{cookies:[],origins:[{origin:'https://127.0.0.1:8766',localStorage:[{name:'ducky.token',value:account.token}]}]}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(12000);
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!=='https://127.0.0.1:8766'){await route.abort();return;}
   if(url.pathname==='/calendar.json'){await route.fulfill({json:{events:[],source:'synthetic_qa'}});return;}
   await route.continue();
  });
  const result={label,engine,width,height,open_access:openTour,real_device:false,data:'synthetic shared research; real local auth/watchlist/trial/onboarding APIs'};
  try{
   await page.goto('https://127.0.0.1:8766/'+lang+'/app/#/'+(openTour?'briefing':'watchlist'));
   await page.getByRole('button',{name:txt('tour.start'),exact:true}).waitFor();
   if(openTour){
    assert.ok((await page.locator('.tour-card').textContent()).includes(txt('tour.welcome_open')));
    assert.equal(await page.locator('.tour-expiry').count(),0);
   }
   await page.getByRole('button',{name:txt('tour.start'),exact:true}).click();
   const form=page.locator('[data-tour="watchlist.add"]');
   await form.locator('input').fill('NVDA');
   await form.getByRole('button',{name:txt('watch.add'),exact:true}).click();
   await page.locator('[data-tour="stock.map"][data-ticker="NVDA"]').first().click();
   await page.locator('.tour-card h2').filter({hasText:txt('tour.step_node')}).waitFor();
   await page.waitForFunction(()=>{
    const target=document.querySelector('[data-tour~="node.open"]'),ring=document.querySelector('.tour-ring'),card=document.querySelector('.tour-card');
    if(!target||!ring||ring.hidden||!card)return false;
    const r=target.getBoundingClientRect(),c=card.getBoundingClientRect(),highlight=ring.getBoundingClientRect();
    return r.top>=0&&r.bottom<=innerHeight&&Math.abs(highlight.top-(r.top-5))<2
      &&(c.bottom<=r.top||c.top>=r.bottom||c.left>=r.right||c.right<=r.left);
   });
   await page.screenshot({path:output+'/'+label+'-map.png',fullPage:false});
   await page.locator('[data-tour~="node.open"]').first().click();
   await page.locator('.tour-card h2').filter({hasText:txt('tour.step_chart')}).waitFor();
   await page.locator('.tour-route').click();
   await page.locator('[data-period="3mo"]').click();
   await page.getByRole('button',{name:txt('tour.chapter_1'),exact:true}).waitFor();
   const state=await fetch('http://127.0.0.1:8767/me/onboarding',{headers:{Authorization:'Bearer '+account.token}}).then(r=>r.json());
   assert.deepEqual(state.completed,['add','map','node','chart']);
   await page.getByRole('button',{name:txt('tour.chapter_1'),exact:true}).click();
   await page.locator('.tour-route').click();
   await page.locator('[data-tour~="opinion.open"]').first().click();
   await page.locator('[data-tour="source.original"]').click();
   await page.locator('[data-tour="video.open"]').click();
   await page.getByRole('button',{name:txt('tour.chapter_2'),exact:true}).click();
   await page.locator('.tour-route').click();
   await page.locator('[data-tour="calendar.day"][data-date="'+state.examples.calendar.date+'"]').first().click();
   await page.getByRole('button',{name:txt('tour.chapter_3'),exact:true}).click();
   await page.locator('.tour-route').click();
   await page.locator('[data-source-record]').click();
   await page.locator('.tour-route').click();
   await page.getByRole('button',{name:txt('tour.done'),exact:true}).click();
   await page.locator('.tour-card h2').filter({hasText:txt('tour.finished')}).waitFor();
   const finalState=await fetch('http://127.0.0.1:8767/me/onboarding',{headers:{Authorization:'Bearer '+account.token}}).then(r=>r.json());
   assert.equal(finalState.completed.length,10);assert.equal(finalState.outcomes.video,'external_link_opened');
   await page.reload();await page.getByRole('button',{name:txt('tour.help'),exact:true}).click();
   await page.getByRole('button',{name:txt('tour.chapter_1'),exact:true}).waitFor();
   const list=await fetch('http://127.0.0.1:8767/watchlist',{headers:{Authorization:'Bearer '+account.token}}).then(r=>r.json());assert.equal(list.items.length,1);
   if(openTour){
    const me=await fetch('http://127.0.0.1:8767/me',{headers:{Authorization:'Bearer '+account.token}}).then(r=>r.json());
    assert.equal(me.access.billing_enabled,false);assert.equal(me.entitlement.trial,null);
   }else{
   await fetch('http://127.0.0.1:8767/admin/qa/expire',{method:'POST',headers:{Authorization:'Bearer '+account.token}});
   await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
   await page.getByText(txt('trial.ended'),{exact:true}).first().waitFor();
   const denied=await fetch('http://127.0.0.1:8767/evidence/NVDA',{headers:{Authorization:'Bearer '+account.token}});assert.equal(denied.status,402);
   assert.equal(await page.locator('.evidence-detail,.tv-lightweight-charts').count(),0);
   }
   assert.deepEqual(errors,[]);result.status='passed';
  }catch(error){result.status='failed';result.error=String(error);result.pageErrors=errors;result.responses=responses;result.location=page.url();result.storage=await page.evaluate(()=>!!localStorage.getItem('ducky.token')).catch(()=>false);await page.screenshot({path:output+'/'+label+'-failure.png'}).catch(()=>{});}
  console.log(JSON.stringify(result));results.push(result);await context.close();
 }
 await browser.close();
}
await writeFile(output+'/browser-results.json',JSON.stringify(results,null,2)+'\n');
if(results.some(r=>r.status!=='passed'))process.exitCode=1;
