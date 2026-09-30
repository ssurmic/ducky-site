// Exercise real view handlers against loopback-only fixtures. Membership writes stay in memory.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8953',output=process.env.QA_OUTPUT||'/tmp/ducky-workspace-flows';
await mkdir(output,{recursive:true});const browser=await chromium.launch(),results=[];
for(const width of [320,390,1440])for(const lang of ['zh','en'])for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width,height:width===320?600:width===390?700:900},hasTouch:width<500,isMobile:width<500,reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[],checks=[],label=width+'-'+lang+'-'+theme;
 const copy=JSON.parse(readFileSync('i18n/'+lang+'.json')),s=key=>copy['app.'+key];
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(6000);
 const visit=async(route,fixture='first-use',auth='in')=>{await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=${route}&case=${fixture}&auth=${auth}`);await page.locator('.route-page h1').first().waitFor();};
 const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
 try{
  await visit('watchlist');check('empty membership',/0\/50/.test(await page.locator('#watch-count').innerText()));
  check('dated discovery examples',await page.locator('.watchlist-view a[href="#/stock/NVDA"]').count()>0);
  await page.locator('.watchlist-view a[href="#/stock/NVDA"]').first().click();await page.locator('[data-stock-watch]').waitFor();
  await page.locator('[data-stock-watch]').click();await page.getByRole('button',{name:s('focus.unfollow_stock'),exact:true}).waitFor();checks.push('first stock added');
  for(const key of ['metrics','evidence','history','overview']){
   await page.locator(`[data-stock-tab=${key}]`).click();await page.waitForURL(url=>url.hash.includes('tab='+key));
   await page.locator(`[data-stock-tab=${key}][aria-current=page]`).waitFor();
   check('stock '+key,await page.locator(`[data-stock-tab=${key}]`).getAttribute('aria-current')==='page');
  }
  await page.locator('[data-stock-tool=kline]').first().click();await page.locator('.tv-lightweight-charts canvas').first().waitFor();checks.push('candles rendered');
  for(const period of ['3mo','1y','2y','6mo']){await page.locator(`[data-period="${period}"]`).click();check('chart '+period,await page.locator(`[data-period="${period}"]`).getAttribute('aria-pressed')==='true');}
  for(const interval of ['week','month','day']){await page.locator(`[data-interval=${interval}]`).click();check('chart '+interval,await page.locator(`[data-interval=${interval}]`).getAttribute('aria-pressed')==='true');}
  await page.locator('.chart-reading-help').click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');check('chart dialog closes',await page.getByRole('dialog').count()===0);
  await page.locator('[data-chart-zoom=in]').click();await page.locator('[data-chart-zoom=reset]').click();checks.push('chart zoom reset');
  await page.locator('.chart-back').click();await page.locator('[data-stock-tab=overview]').waitFor();check('chart returns to same tab',page.url().includes('tab=overview'));
  await page.locator('.app-nav a[href="#/watchlist"]').click();await page.locator('tbody tr').waitFor();check('membership survives route changes',/1\/50/.test(await page.locator('#watch-count').innerText()));
  for(const mode of ['reading','metrics','heatmap','list']){await page.locator(`[data-mode=${mode}]`).click();check('watch '+mode,await page.locator(`[data-mode=${mode}]`).getAttribute('aria-pressed')==='true');}
  await visit('calendar','ux-review');
  for(const mode of ['month','list','biweekly']){await page.getByRole('button',{name:s('calendar.mode_'+mode),exact:true}).click();check('calendar '+mode,await page.getByRole('button',{name:s('calendar.mode_'+mode),exact:true}).getAttribute('aria-pressed')==='true');}
  const day=page.locator('[data-tour="calendar.day"]').first();await day.click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');check('calendar dialog focus restored',await day.evaluate(node=>node===document.activeElement));
  await page.locator('.cal-history-link').click();check('history focus',await page.locator('#seasonality-history').evaluate(node=>node===document.activeElement));
  await page.locator('.season-month-select').selectOption('10');await page.locator('.season-window').selectOption('after');await page.locator('.season-controls button').click();
  check('complete midterm cohort',/N=6/.test(await page.locator('.seasonality-view [role=status]').innerText()));
  await page.locator('.season-details>summary').first().click();await page.locator('.season-year-select').selectOption('2010');await page.locator('.season-order').selectOption('old');
  check('year filter and sort',await page.locator('.season-table tbody th').allTextContents().then(x=>x.join(',')==='2010,2014,2018'));
  await page.locator('.season-reading>summary').click();check('full interpretation',await page.locator('.season-reading[open]>p').isVisible());
  await page.locator('.season-details>summary').last().click();check('method and download',await page.locator('a[href="/seasonality.json"]').isVisible());
  await visit('creators');await page.locator('.creator-discovery-preview').first().waitFor();checks.push('new creators default to discovery');await page.getByRole('button',{name:s('creators.mine'),exact:true}).click();await page.getByText(s('creators.no_following'),{exact:true}).waitFor();check('empty following guidance',await page.getByText(s('creators.no_following'),{exact:true}).isVisible());
  await page.getByRole('button',{name:s('creators.discover'),exact:true}).first().click();await page.locator('.creator-discovery-preview').first().waitFor();checks.push('creator discovery from empty following');
  await visit('profile');await page.locator('[name=email]').fill('invalid');await page.locator('.profile>.form button[type=submit]').click();check('invalid profile stays on field',await page.locator('[name=email]').evaluate(node=>node===document.activeElement));
  await page.screenshot({path:output+'/'+label+'-profile.png'});
  await visit('today');check('empty research offers start',await page.locator('a[href="#/watchlist"]').count()>1);await page.screenshot({path:output+'/'+label+'-first-use.png'});
  assert.deepEqual(errors,[]);results.push({label,status:'passed',checks});
 }catch(error){results.push({label,status:'failed',checks,error:String(error),errors,url:page.url()});await page.screenshot({path:output+'/'+label+'-failure.png'});}
 await context.close();
}
await browser.close();await writeFile(output+'/results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status!=='passed'))process.exitCode=1;
