const express = require('express');
const puppeteer = require('puppeteer');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// Configuration for multiple instances
const CONFIG = {
  maxConcurrentInstances: 5,
  defaultInstances: 3,
  scrollSessions: { min: 3, max: 7 },
  scrollDistance: { min: 200, max: 1000 },
  waitTime: { min: 1000, max: 3000 },
  stayTime: { min: 5000, max: 15000 }
};

// Function to perform random scrolling on tutor4u.tech (single instance)
async function performRandomScrolling(instanceId = 1) {
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true, // Set to false if you want to see the browser in action
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent to simulate real user
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the website
    console.log(`[Instance ${instanceId}] Navigating to tutor4u.tech...`);
    await page.goto('https://tutor4u.tech/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Perform random scrolling
    const scrollSessions = Math.floor(Math.random() * (CONFIG.scrollSessions.max - CONFIG.scrollSessions.min + 1)) + CONFIG.scrollSessions.min;
    console.log(`[Instance ${instanceId}] Performing ${scrollSessions} scroll sessions...`);
    
    for (let i = 0; i < scrollSessions; i++) {
      // Random scroll direction and distance
      const scrollDirection = Math.random() > 0.5 ? 'down' : 'up';
      const scrollDistance = Math.floor(Math.random() * (CONFIG.scrollDistance.max - CONFIG.scrollDistance.min + 1)) + CONFIG.scrollDistance.min;
      
      if (scrollDirection === 'down') {
        await page.evaluate((distance) => {
          window.scrollBy(0, distance);
        }, scrollDistance);
      } else {
        await page.evaluate((distance) => {
          window.scrollBy(0, -distance);
        }, scrollDistance);
      }
      
      // Random wait between scrolls
      const waitTime = Math.floor(Math.random() * (CONFIG.waitTime.max - CONFIG.waitTime.min + 1)) + CONFIG.waitTime.min;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      console.log(`[Instance ${instanceId}] Scroll ${i + 1}: ${scrollDirection} ${scrollDistance}px`);
    }
    
    // Stay on page for a random amount of time
    const stayTime = Math.floor(Math.random() * (CONFIG.stayTime.max - CONFIG.stayTime.min + 1)) + CONFIG.stayTime.min;
    console.log(`[Instance ${instanceId}] Staying on page for ${stayTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, stayTime));
    
    console.log(`[Instance ${instanceId}] Scrolling session completed successfully!`);
    return { success: true, instanceId, scrollSessions, duration: stayTime };
    
  } catch (error) {
    console.error(`[Instance ${instanceId}] Error during scrolling session:`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Function to run multiple instances concurrently
async function runMultipleInstances(instanceCount = CONFIG.defaultInstances) {
  const maxInstances = Math.min(instanceCount, CONFIG.maxConcurrentInstances);
  console.log(`Starting ${maxInstances} concurrent instances...`);
  
  const promises = [];
  for (let i = 1; i <= maxInstances; i++) {
    promises.push(performRandomScrolling(i));
  }
  
  try {
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Multiple instances completed: ${successful} successful, ${failed} failed`);
    
    return {
      totalInstances: maxInstances,
      successful,
      failed,
      results: results.map((result, index) => ({
        instanceId: index + 1,
        status: result.status,
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }))
    };
  } catch (error) {
    console.error('Error in multiple instances execution:', error);
    throw error;
  }
}

// Route to trigger manual scrolling (single instance)
router.get('/scroll', async function(req, res, next) {
  try {
    const result = await performRandomScrolling();
    res.json({ 
      success: true, 
      message: 'Random scrolling completed successfully!',
      timestamp: new Date().toISOString(),
      data: result
    });
  } catch (error) {
    console.error('Scrolling error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during scrolling session',
      error: error.message 
    });
  }
});

// Route to trigger multiple instances
router.get('/scroll-multi', async function(req, res, next) {
  try {
    const instanceCount = parseInt(req.query.instances) || CONFIG.defaultInstances;
    const result = await runMultipleInstances(instanceCount);
    
    res.json({ 
      success: true, 
      message: `Multiple instances scrolling completed!`,
      timestamp: new Date().toISOString(),
      data: result
    });
  } catch (error) {
    console.error('Multiple instances scrolling error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during multiple instances scrolling session',
      error: error.message 
    });
  }
});

// Route to start continuous scrolling with intervals
router.get('/scroll-continuous', async function(req, res, next) {
  try {
    const interval = parseInt(req.query.interval) || 300000; // 5 minutes default
    const instances = parseInt(req.query.instances) || CONFIG.defaultInstances;
    
    // Start immediate execution
    runMultipleInstances(instances).catch(console.error);
    
    // Set up interval for continuous execution
    const intervalId = setInterval(() => {
      console.log('Running scheduled multiple instances...');
      runMultipleInstances(instances).catch(console.error);
    }, interval);
    
    // Store interval ID for potential cleanup (in production, you'd want to manage this better)
    global.scrollInterval = intervalId;
    
    res.json({ 
      success: true, 
      message: `Continuous scrolling started with ${instances} instances every ${interval}ms`,
      timestamp: new Date().toISOString(),
      config: {
        interval,
        instances,
        maxConcurrentInstances: CONFIG.maxConcurrentInstances
      }
    });
  } catch (error) {
    console.error('Continuous scrolling setup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error setting up continuous scrolling',
      error: error.message 
    });
  }
});

// Function to perform scrolling with page reloads (single instance)
async function performScrollingWithReloads(instanceId = 1, reloadCount = 3) {
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent to simulate real user
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    const results = [];
    
    for (let reload = 1; reload <= reloadCount; reload++) {
      try {
        // Navigate to the website
        console.log(`[Instance ${instanceId}] Reload ${reload}/${reloadCount} - Navigating to tutor4u.tech...`);
        await page.goto('https://tutor4u.tech/', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Perform random scrolling
        const scrollSessions = Math.floor(Math.random() * (CONFIG.scrollSessions.max - CONFIG.scrollSessions.min + 1)) + CONFIG.scrollSessions.min;
        console.log(`[Instance ${instanceId}] Reload ${reload} - Performing ${scrollSessions} scroll sessions...`);
        
        for (let i = 0; i < scrollSessions; i++) {
          // Random scroll direction and distance
          const scrollDirection = Math.random() > 0.5 ? 'down' : 'up';
          const scrollDistance = Math.floor(Math.random() * (CONFIG.scrollDistance.max - CONFIG.scrollDistance.min + 1)) + CONFIG.scrollDistance.min;
          
          if (scrollDirection === 'down') {
            await page.evaluate((distance) => {
              window.scrollBy(0, distance);
            }, scrollDistance);
          } else {
            await page.evaluate((distance) => {
              window.scrollBy(0, -distance);
            }, scrollDistance);
          }
          
          // Random wait between scrolls
          const waitTime = Math.floor(Math.random() * (CONFIG.waitTime.max - CONFIG.waitTime.min + 1)) + CONFIG.waitTime.min;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          console.log(`[Instance ${instanceId}] Reload ${reload} - Scroll ${i + 1}: ${scrollDirection} ${scrollDistance}px`);
        }
        
        // Stay on page for a random amount of time
        const stayTime = Math.floor(Math.random() * (CONFIG.stayTime.max - CONFIG.stayTime.min + 1)) + CONFIG.stayTime.min;
        console.log(`[Instance ${instanceId}] Reload ${reload} - Staying on page for ${stayTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, stayTime));
        
        results.push({
          reload: reload,
          success: true,
          scrollSessions: scrollSessions,
          stayTime: stayTime
        });
        
        // Wait before next reload (if not the last one)
        if (reload < reloadCount) {
          const reloadWait = Math.floor(Math.random() * 3000) + 1000; // 1-4 seconds
          console.log(`[Instance ${instanceId}] Waiting ${reloadWait}ms before next reload...`);
          await new Promise(resolve => setTimeout(resolve, reloadWait));
        }
        
      } catch (reloadError) {
        console.error(`[Instance ${instanceId}] Error during reload ${reload}:`, reloadError);
        results.push({
          reload: reload,
          success: false,
          error: reloadError.message
        });
      }
    }
    
    console.log(`[Instance ${instanceId}] Completed ${reloadCount} reloads with scrolling sessions!`);
    return { success: true, instanceId, reloadCount, results };
    
  } catch (error) {
    console.error(`[Instance ${instanceId}] Error during scrolling with reloads:`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Function to run multiple instances with reloads
async function runMultipleInstancesWithReloads(instanceCount = CONFIG.defaultInstances, reloadCount = 3) {
  const maxInstances = Math.min(instanceCount, CONFIG.maxConcurrentInstances);
  console.log(`Starting ${maxInstances} concurrent instances with ${reloadCount} reloads each...`);
  
  const promises = [];
  for (let i = 1; i <= maxInstances; i++) {
    promises.push(performScrollingWithReloads(i, reloadCount));
  }
  
  try {
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Multiple instances with reloads completed: ${successful} successful, ${failed} failed`);
    
    return {
      totalInstances: maxInstances,
      reloadCount,
      successful,
      failed,
      results: results.map((result, index) => ({
        instanceId: index + 1,
        status: result.status,
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }))
    };
  } catch (error) {
    console.error('Error in multiple instances with reloads execution:', error);
    throw error;
  }
}

// Route to trigger scrolling with page reloads
router.get('/scroll-reload', async function(req, res, next) {
  try {
    const instances = parseInt(req.query.instances) || CONFIG.defaultInstances;
    const reloads = parseInt(req.query.reloads) || 3;
    
    const result = await runMultipleInstancesWithReloads(instances, reloads);
    
    res.json({ 
      success: true, 
      message: `Scrolling with ${reloads} reloads per instance completed!`,
      timestamp: new Date().toISOString(),
      data: result
    });
  } catch (error) {
    console.error('Scrolling with reloads error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during scrolling with reloads session',
      error: error.message 
    });
  }
});

// Route to start continuous scrolling with reloads
router.get('/scroll-reload-continuous', async function(req, res, next) {
  try {
    const interval = parseInt(req.query.interval) || 300000; // 5 minutes default
    const instances = parseInt(req.query.instances) || CONFIG.defaultInstances;
    const reloads = parseInt(req.query.reloads) || 3;
    
    // Start immediate execution
    runMultipleInstancesWithReloads(instances, reloads).catch(console.error);
    
    // Set up interval for continuous execution
    const intervalId = setInterval(() => {
      console.log('Running scheduled multiple instances with reloads...');
      runMultipleInstancesWithReloads(instances, reloads).catch(console.error);
    }, interval);
    
    // Store interval ID for potential cleanup
    global.scrollReloadInterval = intervalId;
    
    res.json({ 
      success: true, 
      message: `Continuous scrolling with reloads started: ${instances} instances, ${reloads} reloads each, every ${interval}ms`,
      timestamp: new Date().toISOString(),
      config: {
        interval,
        instances,
        reloads,
        maxConcurrentInstances: CONFIG.maxConcurrentInstances
      }
    });
  } catch (error) {
    console.error('Continuous scrolling with reloads setup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error setting up continuous scrolling with reloads',
      error: error.message 
    });
  }
});

// Route to stop continuous scrolling
router.get('/scroll-stop', function(req, res, next) {
  try {
    let stoppedIntervals = 0;
    let messages = [];
    
    if (global.scrollInterval) {
      clearInterval(global.scrollInterval);
      global.scrollInterval = null;
      stoppedIntervals++;
      messages.push('Regular continuous scrolling stopped');
    }
    
    if (global.scrollReloadInterval) {
      clearInterval(global.scrollReloadInterval);
      global.scrollReloadInterval = null;
      stoppedIntervals++;
      messages.push('Continuous scrolling with reloads stopped');
    }
    
    if (stoppedIntervals > 0) {
      res.json({ 
        success: true, 
        message: messages.join('. '),
        stoppedIntervals,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({ 
        success: false, 
        message: 'No continuous scrolling sessions were running',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error stopping continuous scrolling:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error stopping continuous scrolling',
      error: error.message 
    });
  }
});

// Route to stop continuous scrolling
router.get('/scroll-stop-old', function(req, res, next) {
  try {
    if (global.scrollInterval) {
      clearInterval(global.scrollInterval);
      global.scrollInterval = null;
      res.json({ 
        success: true, 
        message: 'Continuous scrolling stopped',
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({ 
        success: false, 
        message: 'No continuous scrolling session was running',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error stopping continuous scrolling:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error stopping continuous scrolling',
      error: error.message 
    });
  }
});

module.exports = router;
