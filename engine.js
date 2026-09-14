/**
 * ImageEngine Drop-in Client Script (v2.0)
 * Accelerates all images on your website with zero-downtime edge fallback.
 * Hosted on Cloudflare Pages for unlimited, zero-quota edge script delivery.
 * 
 * Usage (HTML Attributes):
 * <script src="https://imagengine.grisma.info.np/engine.js" data-tenant="YOUR_TENANT" data-subdomain="blog" async></script>
 * 
 * Usage (JSON Configuration):
 * <script src="https://imagengine.grisma.info.np/engine.js" data-options='{"tenant":"tn","subdomain":"blog","format":"webp"}' async></script>
 * Or via global: window.ImageEngineConfig = { tenant: 'tn', subdomain: 'blog' };
 */
(function() {
  'use strict';

  var script = document.currentScript || (function() {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

  // Parse JSON options if provided
  var jsonOpts = {};
  if (window.ImageEngineConfig && typeof window.ImageEngineConfig === 'object') {
    jsonOpts = window.ImageEngineConfig;
  } else if (script) {
    var rawOptions = script.getAttribute('data-options');
    if (rawOptions) {
      try {
        jsonOpts = JSON.parse(rawOptions);
      } catch (e) {}
    }
  }

  var tenant = jsonOpts.tenant || (script ? script.getAttribute('data-tenant') : '') || '';
  var subdomain = jsonOpts.subdomain !== undefined ? jsonOpts.subdomain : (script ? script.getAttribute('data-subdomain') : '');
  var cdnHost = (jsonOpts.cdn || (script ? script.getAttribute('data-cdn') : '') || 'https://img.topnepali.com').replace(/\/+$/, '');
  var defaultFormat = (jsonOpts.format || (script ? script.getAttribute('data-format') : '') || 'webp').toLowerCase();
  var autoAvatar = jsonOpts.avatar !== undefined ? Boolean(jsonOpts.avatar) : (script ? script.getAttribute('data-avatar') === 'true' : false);

  // Per-format rewrite mappings: { png: 'webp', jpg: 'preserve', gif: 'preserve', svg: 'skip' }
  var formatMap = {};
  if (jsonOpts.formats && typeof jsonOpts.formats === 'object') {
    formatMap = jsonOpts.formats;
  } else if (jsonOpts.formatMap && typeof jsonOpts.formatMap === 'object') {
    formatMap = jsonOpts.formatMap;
  } else if (script) {
    var rawFormats = script.getAttribute('data-formats');
    if (rawFormats) {
      var pairs = rawFormats.split(',');
      for (var p = 0; p < pairs.length; p++) {
        var parts = pairs[p].split(':');
        if (parts.length === 2) {
          formatMap[parts[0].trim().toLowerCase()] = parts[1].trim().toLowerCase();
        }
      }
    }
  }

  // Preserve list: extensions served untouched in original format with edge CDN shield & zero compute
  var rawPreserve = jsonOpts.preserve || (script ? script.getAttribute('data-preserve') : '') || [];
  var preserveList = Array.isArray(rawPreserve) ? rawPreserve : (typeof rawPreserve === 'string' ? rawPreserve.split(',') : []);
  var preserveSet = {};
  for (var pi = 0; pi < preserveList.length; pi++) {
    var extClean = preserveList[pi].trim().toLowerCase();
    if (extClean) preserveSet[extClean] = true;
  }

  // Skip list: extensions completely ignored by the engine (retained as origin links)
  var rawSkip = jsonOpts.skip || (script ? script.getAttribute('data-skip') : '') || [];
  var skipList = Array.isArray(rawSkip) ? rawSkip : (typeof rawSkip === 'string' ? rawSkip.split(',') : []);
  var skipSet = {};
  for (var si = 0; si < skipList.length; si++) {
    var extSkip = skipList[si].trim().toLowerCase();
    if (extSkip) skipSet[extSkip] = true;
  }

  if (!tenant) return;

  // Clean subdomain (ignore 'main' or '@' or 'www' or empty for root domain)
  var cleanSub = (subdomain || '').trim().toLowerCase();
  var isSubdomain = cleanSub && cleanSub !== 'main' && cleanSub !== '@' && cleanSub !== 'www';
  var namespace = isSubdomain ? (cleanSub + '.' + tenant) : tenant;

  function optimizeImage(img) {
    if (!img || img.dataset.engineProcessed || img.dataset.noEngine) return;
    var originalSrc = img.getAttribute('src');
    if (!originalSrc || originalSrc.indexOf('data:') === 0 || originalSrc.indexOf('blob:') === 0) return;
    if (originalSrc.indexOf(cdnHost) !== -1) return;

    var cleanPath = originalSrc;
    if (cleanPath.indexOf('http://') === 0 || cleanPath.indexOf('https://') === 0) {
      try {
        cleanPath = new URL(cleanPath).pathname;
      } catch (e) {
        return;
      }
    }
    cleanPath = cleanPath.replace(/^\/+/, '');
    if (!cleanPath) return;

    var extMatch = cleanPath.match(/\.(jpe?g|png|webp|svg|gif|avif)$/i);
    if (!extMatch) return;
    var origExt = extMatch[1].toLowerCase().replace('jpeg', 'jpg');

    // If marked to skip, leave image untouched pointing to origin
    if (skipSet[origExt] || formatMap[origExt] === 'skip' || formatMap[origExt] === 'none') {
      return;
    }

    // Determine target format
    var targetExt = formatMap[origExt] || (preserveSet[origExt] ? 'preserve' : defaultFormat);
    if (targetExt === 'preserve' || targetExt === 'original' || targetExt === 'same' || targetExt === 'keep') {
      targetExt = origExt;
    }

    img.dataset.originSrc = originalSrc;
    img.dataset.engineProcessed = 'true';

    var isPreserved = (targetExt === origExt);
    var isAvatar = autoAvatar || img.classList.contains('avatar') || img.classList.contains('profile-pic');
    var params = [];
    if (isAvatar) params.push('avatar=true');
    if (!isPreserved && img.width && img.width > 0 && img.width < 1400) {
      var dpr = window.devicePixelRatio || 1;
      params.push('w=' + Math.round(img.width * (dpr > 1 ? 1.5 : 1)));
    }

    var edgePath = cleanPath.replace(/\.(jpe?g|png|webp|svg|gif|avif)$/i, function(_, ext) {
      return '-' + ext.toLowerCase().replace('jpeg', 'jpg') + '.' + targetExt;
    });

    var qs = params.length ? ('?' + params.join('&')) : '';
    var edgeUrl = cdnHost + '/' + namespace + '/' + edgePath + qs;

    function onImgError() {
      img.removeEventListener('error', onImgError);
      if (img.dataset.originSrc && img.src !== img.dataset.originSrc) {
        img.src = img.dataset.originSrc;
      }
    }
    img.addEventListener('error', onImgError);

    img.src = edgeUrl;
  }

  function scan() {
    var images = document.querySelectorAll('img:not([data-engine-processed])');
    for (var i = 0; i < images.length; i++) {
      optimizeImage(images[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  if (window.MutationObserver) {
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.addedNodes) {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.tagName === 'IMG') {
              optimizeImage(node);
            } else if (node.querySelectorAll) {
              var imgs = node.querySelectorAll('img:not([data-engine-processed])');
              for (var k = 0; k < imgs.length; k++) optimizeImage(imgs[k]);
            }
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
