/*
 * Sprinkle Town Tycoon — cartoon drawings.
 * Every picture is a small inline SVG with chunky dark outlines.
 */
(function (root) {
  'use strict';

  const INK = '#2B2147';

  function svg(inner, label, viewBox) {
    return '<svg viewBox="' + (viewBox || '0 0 100 100') + '" role="img" aria-label="' + (label || '') + '">' +
      '<g stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' + inner + '</g></svg>';
  }

  const shadow = '<ellipse cx="50" cy="91" rx="36" ry="5" fill="' + INK + '" opacity=".14" stroke="none"/>';

  // Striped awning across x..x+w with scalloped bottom edge.
  function awning(x, y, w, h, n, c1, c2) {
    const sw = w / n;
    let out = '';
    for (let k = 0; k < n; k++) {
      const sx = x + k * sw;
      out += '<path d="M' + sx + ' ' + y + 'h' + sw + 'v' + h + 'q' + (-sw / 2) + ' ' + (h * 0.55) + ' ' + (-sw) + ' 0z" fill="' + (k % 2 ? c2 : c1) + '"/>';
    }
    return out;
  }

  function sparkle(x, y, r, fill) {
    return '<path d="M' + x + ' ' + (y - r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) +
      'Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + 'z" fill="' + fill + '" stroke-width="2"/>';
  }

  // Five-pointed star as a path.
  function star5(cx, cy, R, r) {
    let d = '';
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? r : R;
      d += (k ? 'L' : 'M') + (cx + Math.cos(a) * rad).toFixed(1) + ' ' + (cy + Math.sin(a) * rad).toFixed(1);
    }
    return d + 'z';
  }

  // A crayon standing on end, used as the Crayon Factory's chimneys.
  function crayonStack(x, top, color) {
    return '<path d="M' + x + ' 46V' + top + 'h10V46z" fill="' + color + '"/>' +
      '<path d="M' + x + ' ' + top + 'l5-10l5 10z" fill="' + color + '"/>' +
      '<path d="M' + (x + 1.5) + ' ' + (top + 7) + 'h7M' + (x + 1.5) + ' ' + (top + 14) + 'h7" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>';
  }

  // Circle with a hole, as one path (even-odd fill).
  function ring(cx, cy, r, hole) {
    return 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0z' +
      'M' + (cx - hole) + ' ' + cy + 'a' + hole + ' ' + hole + ' 0 1 0 ' + (2 * hole) + ' 0a' + hole + ' ' + hole + ' 0 1 0 ' + (-2 * hole) + ' 0z';
  }

  // ---------------------------------------------------------------------------
  // Shops
  // ---------------------------------------------------------------------------
  const SHOPS = {
    lemon: function () {
      return shadow +
        '<rect x="22" y="28" width="6" height="56" fill="#C98B4F"/><rect x="72" y="28" width="6" height="56" fill="#C98B4F"/>' +
        '<rect x="10" y="12" width="80" height="9" rx="4" fill="#FF5FA2"/>' +
        awning(12, 20, 76, 14, 8, '#FFE14D', '#FFFFFF') +
        '<rect x="14" y="56" width="72" height="31" rx="4" fill="#F6C177"/>' +
        '<path d="M14 66h72" fill="none"/>' +
        '<ellipse cx="50" cy="76" rx="12" ry="8" fill="#FFE14D"/><path d="M58 70q6-6 10-2q-4 5-10 2z" fill="#3DDC97" stroke-width="2.5"/>' +
        '<path d="M58 40h12l-1 16h-10z" fill="#FFF7B8"/><path d="M58 45h11.6l-0.8 11h-10z" fill="#FFE14D" stroke="none"/><path d="M58 40h12l-1 16h-10z" fill="none"/>' +
        '<path d="M70 44q5 0 5 5t-5 5" fill="none"/>' +
        '<rect x="30" y="44" width="10" height="12" rx="2" fill="#FFE14D"/><path d="M37 44l4-10" fill="none"/>';
    },
    icecream: function () {
      return shadow +
        '<path d="M50 52V22" fill="none"/>' +
        '<path d="M16 28Q50-6 84 28z" fill="#3DDCD0"/><path d="M38 28Q42 8 50 6Q58 8 62 28z" fill="#FFFFFF"/>' +
        '<path d="M16 28q5 6 11.3 0q5.7 6 11.3 0q5.7 6 11.4 0q5.7 6 11.3 0q5.7 6 11.4 0q5.7 6 11.3 0" fill="none"/>' +
        '<rect x="16" y="50" width="66" height="28" rx="7" fill="#FF8FC7"/>' +
        '<path d="M16 62h66" fill="none" stroke="#FFFFFF" stroke-width="5"/><rect x="16" y="50" width="66" height="28" rx="7" fill="none"/>' +
        '<path d="M82 58l10-8" fill="none"/><circle cx="92" cy="49" r="2.5" fill="' + INK + '"/>' +
        '<circle cx="32" cy="82" r="8" fill="#8C6CFF"/><circle cx="32" cy="82" r="2" fill="#FFFFFF"/>' +
        '<circle cx="68" cy="82" r="8" fill="#8C6CFF"/><circle cx="68" cy="82" r="2" fill="#FFFFFF"/>' +
        '<path d="M43 62l7 14l7-14z" fill="#F4A259"/><circle cx="50" cy="58" r="7" fill="#FFF1F8"/><circle cx="50" cy="51" r="1.8" fill="#FF3B6B" stroke="none"/>';
    },
    donut: function () {
      return shadow +
        '<rect x="16" y="46" width="68" height="40" fill="#FFF3D6"/>' +
        awning(14, 44, 72, 11, 6, '#FF7EB6', '#FFFFFF') +
        '<rect x="42" y="62" width="16" height="24" rx="2" fill="#C98B4F"/><circle cx="54" cy="75" r="1.5" fill="' + INK + '"/>' +
        '<rect x="22" y="62" width="14" height="12" rx="2" fill="#9BE7FF"/><rect x="64" y="62" width="14" height="12" rx="2" fill="#9BE7FF"/>' +
        '<path d="M40 44v-6M60 44v-6" fill="none"/>' +
        '<path d="' + ring(50, 24, 19, 6) + '" fill="#E8A25B" fill-rule="evenodd"/>' +
        '<path d="M33 22q2-12 17-14q15 2 17 14q-3 6-6 3q-3 4-6 1q-3 4-6 1q-3 4-6 1q-3 3-6-1q-3 3-4-5z" fill="#FF7EB6"/>' +
        '<circle cx="50" cy="24" r="6" fill="#FFE3C7"/>' +
        '<path d="M40 15l3 2M58 13l-2 3M62 21l3-1M37 24l2-3M50 12l3 0" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>' +
        '<path d="M45 13l-1 3M55 19l2 2" fill="none" stroke="#FFD23F" stroke-width="2.5"/>';
    },
    pizza: function () {
      return shadow +
        '<rect x="14" y="46" width="72" height="40" fill="#FFE8CC"/>' +
        awning(12, 44, 76, 11, 8, '#FF5A5F', '#FFFFFF') +
        '<rect x="42" y="62" width="16" height="24" rx="2" fill="#3DDC97"/><circle cx="54" cy="75" r="1.5" fill="' + INK + '"/>' +
        '<rect x="20" y="62" width="16" height="13" rx="2" fill="#9BE7FF"/><rect x="64" y="62" width="16" height="13" rx="2" fill="#9BE7FF"/>' +
        '<path d="M36 44v-6M64 44v-6" fill="none"/>' +
        '<path d="M26 12q24-8 48 0l-24 30z" fill="#FFD23F"/>' +
        '<path d="M24 10q26-9 52 0l-2 6q-24-8-48 0z" fill="#E89B4A"/>' +
        '<circle cx="42" cy="22" r="4" fill="#FF5A5F"/><circle cx="56" cy="21" r="3.5" fill="#FF5A5F"/><circle cx="50" cy="31" r="3" fill="#FF5A5F"/>';
    },
    toys: function () {
      return shadow +
        '<rect x="18" y="44" width="64" height="42" fill="#E4DBFF"/>' +
        '<path d="M12 46L50 18L88 46z" fill="#8C6CFF"/>' +
        sparkle(50, 13, 9, '#FFD23F') +
        '<rect x="24" y="56" width="22" height="18" rx="3" fill="#9BE7FF"/>' +
        '<circle cx="35" cy="66" r="5" fill="#C68A5B"/><circle cx="31" cy="61" r="2.2" fill="#C68A5B" stroke-width="2"/><circle cx="39" cy="61" r="2.2" fill="#C68A5B" stroke-width="2"/>' +
        '<rect x="54" y="60" width="14" height="26" rx="2" fill="#FF9F43"/><circle cx="64" cy="73" r="1.5" fill="' + INK + '"/>' +
        '<rect x="70" y="74" width="12" height="12" rx="2" fill="#FF5FA2"/><rect x="76" y="64" width="10" height="10" rx="2" fill="#3DDC97"/>' +
        '<rect x="10" y="74" width="12" height="12" rx="2" fill="#4CC9F0"/>';
    },
    candy: function () {
      return shadow +
        '<rect x="66" y="22" width="12" height="34" fill="#FF5FA2"/><path d="M66 32h12M66 42h12" fill="none" stroke="#FFFFFF" stroke-width="3"/><rect x="66" y="22" width="12" height="34" fill="none"/>' +
        '<circle cx="70" cy="14" r="6" fill="#FFD6EC"/><circle cx="79" cy="10" r="7" fill="#FFFFFF"/><circle cx="87" cy="16" r="5" fill="#FFD6EC"/>' +
        '<path d="M30 86V52l13-10v10l13-10v10l13-10v10l14-10v44z" fill="#FFD6EC"/>' +
        '<rect x="38" y="64" width="12" height="10" rx="2" fill="#9BE7FF"/><rect x="58" y="64" width="12" height="10" rx="2" fill="#9BE7FF"/>' +
        '<path d="M18 86V46" fill="none" stroke-width="4"/><path d="M18 86V46" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>' +
        '<circle cx="18" cy="36" r="13" fill="#FFE14D"/>' +
        '<path d="M18 36m-1 0a2 2 0 1 1 3 1a5 5 0 1 1 -7 -4a8 8 0 1 1 12 6" fill="none" stroke="#FF5FA2" stroke-width="3"/>' +
        '<circle cx="18" cy="36" r="13" fill="none"/>';
    },
    park: function () {
      return shadow +
        '<rect x="22" y="40" width="56" height="26" fill="#FF6B6B"/>' +
        '<path d="M22 40q7 6 14 0q7 6 14 0q7 6 14 0q7 6 14 0" fill="#FFD23F"/>' +
        '<path d="M40 66v-12a10 10 0 0 1 20 0v12z" fill="#2E2A5A"/>' +
        '<rect x="10" y="30" width="16" height="40" rx="7" fill="#FFD23F"/><rect x="74" y="30" width="16" height="40" rx="7" fill="#FFD23F"/>' +
        '<circle cx="18" cy="28" r="9" fill="#3DDC97"/><circle cx="82" cy="28" r="9" fill="#3DDC97"/>' +
        '<path d="M18 19v-9l7 3l-7 3" fill="#FF5FA2"/><path d="M82 19v-9l7 3l-7 3" fill="#FF5FA2"/>' +
        '<rect x="8" y="64" width="84" height="22" rx="10" fill="#4CC9F0"/>' +
        '<path d="M22 75h8M44 75h12M70 75h8" fill="none" stroke="#FFFFFF" stroke-width="3"/>';
    },
    studio: function () {
      return shadow +
        '<path d="M34 76l-12 14M50 76v14M66 76l12 14" fill="none"/>' +
        '<circle cx="34" cy="27" r="14" fill="#8C6CFF"/><circle cx="34" cy="27" r="4" fill="#FFFFFF"/><circle cx="27" cy="22" r="2.5" fill="#FFFFFF" stroke-width="2"/><circle cx="41" cy="32" r="2.5" fill="#FFFFFF" stroke-width="2"/>' +
        '<circle cx="62" cy="25" r="12" fill="#8C6CFF"/><circle cx="62" cy="25" r="3.5" fill="#FFFFFF"/><circle cx="56" cy="21" r="2.2" fill="#FFFFFF" stroke-width="2"/><circle cx="68" cy="29" r="2.2" fill="#FFFFFF" stroke-width="2"/>' +
        '<rect x="18" y="42" width="54" height="34" rx="7" fill="#FF5FA2"/>' +
        '<path d="M72 52l18-9v32l-18-9z" fill="#4CC9F0"/>' +
        sparkle(38, 59, 9, '#FFD23F') +
        '<circle cx="60" cy="52" r="3" fill="#FF3B3B"/>';
    },
    rocket: function () {
      return '<ellipse cx="50" cy="93" rx="24" ry="4" fill="' + INK + '" opacity=".14" stroke="none"/>' +
        '<path d="M42 72q8 26 16 0z" fill="#FFB627"/><path d="M46 72q4 13 8 0z" fill="#FF6B35" stroke-width="2"/>' +
        '<path d="M36 54l-14 18l15-2z" fill="#FF5A5F"/><path d="M64 54l14 18l-15-2z" fill="#FF5A5F"/>' +
        '<path d="M50 6c16 14 18 42 14 66h-28c-4-24-2-52 14-66z" fill="#F1F5FF"/>' +
        '<path d="M50 6c7 6 11 14 13 22h-26c2-8 6-16 13-22z" fill="#FF5A5F"/>' +
        '<circle cx="50" cy="45" r="10" fill="#9BE7FF"/>' +
        '<path d="M44 45q6-9 12 0z" fill="#F6B04E" stroke-width="2"/><path d="M44 47h12" fill="none" stroke="#8B4A2B" stroke-width="3"/><path d="M45 49h10q-1 3-5 3t-5-3z" fill="#F6B04E" stroke-width="2"/>' +
        '<path d="M46 72v-8M54 72v-8" fill="none"/>';
    },
    moon: function () {
      return sparkle(16, 18, 6, '#FFE14D') + sparkle(84, 12, 5, '#FFFFFF') + sparkle(88, 40, 4, '#FFE14D') +
        '<circle cx="50" cy="104" r="46" fill="#F7E7A1"/>' +
        '<ellipse cx="24" cy="80" rx="7" ry="4" fill="#E2CC72"/><ellipse cx="76" cy="84" rx="6" ry="3.5" fill="#E2CC72"/><ellipse cx="54" cy="92" rx="5" ry="3" fill="#E2CC72"/>' +
        '<path d="M50 30v-16l12 4l-12 4" fill="#FF5FA2"/>' +
        '<path d="M28 66a22 22 0 0 1 44 0z" fill="#9BE7FF"/>' +
        '<path d="M36 52q6-10 16-12" fill="none" stroke="#FFFFFF" stroke-width="3"/>' +
        '<rect x="24" y="64" width="52" height="10" rx="4" fill="#C77DFF"/>' +
        '<rect x="44" y="52" width="12" height="12" rx="2" fill="#FFD23F"/>';
    },
    crayon: function () {
      return shadow +
        crayonStack(22, 22, '#FF5A5F') + crayonStack(45, 14, '#4CC9F0') + crayonStack(68, 26, '#3DDC97') +
        '<rect x="12" y="44" width="76" height="42" rx="3" fill="#FFE8A3"/>' +
        '<path d="M15 54q9-6 18 0t18 0t18 0t16 0" fill="none" stroke="#C77DFF" stroke-width="3"/>' +
        '<rect x="43" y="64" width="14" height="22" rx="2" fill="#FF8A3D"/><circle cx="53" cy="76" r="1.5" fill="' + INK + '"/>' +
        '<rect x="20" y="62" width="15" height="11" rx="2" fill="#9BE7FF"/><rect x="65" y="62" width="15" height="11" rx="2" fill="#9BE7FF"/>';
    },
    sneaker: function () {
      return shadow +
        '<rect x="12" y="52" width="76" height="34" rx="3" fill="#C9F2DB"/>' +
        '<path d="M20 46V30q0-6 6-6h12l8 10q20 0 34 8q6 4 2 4z" fill="#FF5A5F"/>' +
        '<path d="M18 46h66q0 7-7 7h-52q-7 0-7-7z" fill="#FFFFFF"/>' +
        '<path d="M34 30l8 6M40 27l8 6" fill="none" stroke="#FFFFFF" stroke-width="3"/>' +
        '<path d="M28 40q16-6 30 0" fill="none" stroke="#FFD23F" stroke-width="3"/>' +
        '<rect x="43" y="64" width="14" height="22" rx="2" fill="#2ED3A0"/><circle cx="53" cy="76" r="1.5" fill="' + INK + '"/>' +
        '<rect x="20" y="62" width="15" height="11" rx="2" fill="#9BE7FF"/><rect x="65" y="62" width="15" height="11" rx="2" fill="#9BE7FF"/>';
    },
    choco: function () {
      return shadow +
        '<rect x="22" y="22" width="11" height="26" fill="#E8A25B"/><rect x="66" y="14" width="11" height="34" fill="#E8A25B"/>' +
        '<circle cx="27" cy="15" r="5" fill="#C98B5B"/><circle cx="72" cy="7" r="5" fill="#C98B5B"/>' +
        '<rect x="12" y="44" width="76" height="42" rx="3" fill="#B5754A"/>' +
        '<path d="M12 44h76v6q-4 8-8 0q-4 9-9 0q-5 6-9 0q-4 9-9 0q-5 7-9 0q-4 8-9 0q-5 6-9 0q-4 8-14 0z" fill="#6B3A1E"/>' +
        '<rect x="34" y="56" width="32" height="16" rx="2" fill="#6B3A1E"/>' +
        '<path d="M44.7 57.5v13M55.3 57.5v13M35.5 64h29" fill="none" stroke="#8B4A2B" stroke-width="2.5"/>' +
        '<rect x="43" y="74" width="14" height="12" rx="2" fill="#FFD23F"/>' +
        '<rect x="18" y="58" width="10" height="10" rx="2" fill="#FFE3C7"/><rect x="72" y="58" width="10" height="10" rx="2" fill="#FFE3C7"/>';
    },
    robot: function () {
      return shadow +
        '<path d="M50 20V11" fill="none"/><circle cx="50" cy="8" r="4" fill="#FF5A5F"/>' +
        '<rect x="25" y="28" width="6" height="12" rx="2" fill="#9DB4D9"/><rect x="69" y="28" width="6" height="12" rx="2" fill="#9DB4D9"/>' +
        '<rect x="30" y="20" width="40" height="30" rx="7" fill="#E4ECF7"/>' +
        '<circle cx="41" cy="33" r="6" fill="#4CC9F0"/><circle cx="59" cy="33" r="6" fill="#4CC9F0"/>' +
        '<circle cx="41" cy="33" r="2" fill="' + INK + '" stroke="none"/><circle cx="59" cy="33" r="2" fill="' + INK + '" stroke="none"/>' +
        '<rect x="40" y="41" width="20" height="5" rx="2" fill="#FFFFFF"/><path d="M45 41v5M50 41v5M55 41v5" fill="none" stroke-width="2"/>' +
        '<rect x="12" y="50" width="76" height="36" rx="3" fill="#B8C7DD"/>' +
        '<circle cx="28" cy="68" r="9" fill="none" stroke-width="6" stroke-dasharray="3.5 3.6"/><circle cx="28" cy="68" r="7.5" fill="#FFD23F"/><circle cx="28" cy="68" r="2.5" fill="#B8C7DD"/>' +
        '<rect x="44" y="64" width="14" height="22" rx="2" fill="#5B8CFF"/><circle cx="54" cy="76" r="1.5" fill="' + INK + '"/>' +
        '<rect x="66" y="60" width="14" height="11" rx="2" fill="#9BE7FF"/>';
    },
    rainbow: function () {
      let bands = '';
      [['#FF5A5F', 26], ['#FF9F43', 23], ['#FFE14D', 20], ['#3DDC97', 17], ['#4CC9F0', 14]].forEach(function (b) {
        bands += '<path d="M' + (48 - b[1]) + ' 36a' + b[1] + ' ' + b[1] + ' 0 0 1 ' + (2 * b[1]) + ' 0" fill="none" stroke="' + b[0] + '" stroke-width="3.6" stroke-linecap="butt"/>';
      });
      return shadow +
        '<path d="M20.2 36a27.8 27.8 0 0 1 55.6 0M35.8 36a12.2 12.2 0 0 1 24.4 0" fill="none" stroke-width="2"/>' + bands +
        '<rect x="59" y="32" width="20" height="16" fill="#FF8FC7"/>' +
        '<circle cx="20" cy="40" r="7" fill="#FFFFFF"/><circle cx="30" cy="38" r="8" fill="#FFFFFF"/><circle cx="38" cy="42" r="6" fill="#FFFFFF"/>' +
        '<path d="M12 86V50l12-8v8l12-8v8l12-8v8h40v36z" fill="#FFF7FB"/>' +
        '<circle cx="24" cy="64" r="5" fill="#FF5A5F"/><circle cx="36" cy="64" r="5" fill="#FFE14D"/><circle cx="72" cy="64" r="5" fill="#4CC9F0"/>' +
        '<rect x="45" y="64" width="14" height="22" rx="2" fill="#C77DFF"/><circle cx="55" cy="76" r="1.5" fill="' + INK + '"/>';
    },
    star: function () {
      return sparkle(14, 16, 5, '#FFE14D') + sparkle(88, 44, 4, '#FFFFFF') + sparkle(30, 30, 3, '#FFFFFF') +
        '<path d="M60 50L68 24l11 3L74 52z" fill="#C77DFF"/><path d="M66.5 30l11 3" fill="none" stroke="#FFFFFF" stroke-width="3"/>' +
        '<path d="M72 18l-6-6M78 16l-1-8" fill="none" stroke="#FFE14D" stroke-width="3"/>' +
        '<path d="' + star5(82, 11, 9, 4) + '" fill="#FFE14D"/>' +
        '<path d="M12 86V50l13-10v10l13-10v10l13-10v10h37v36z" fill="#8C6CFF"/>' +
        '<rect x="20" y="60" width="12" height="10" rx="2" fill="#FFE14D"/><rect x="68" y="60" width="12" height="10" rx="2" fill="#FFE14D"/>' +
        '<path d="' + star5(50, 60, 7, 3) + '" fill="#FFE14D" stroke-width="2"/>' +
        '<rect x="43" y="70" width="14" height="16" rx="2" fill="#2E2A5A"/>';
    },
  };

  // ---------------------------------------------------------------------------
  // Sprinkle Street buildings: ten building styles in each shop's colors, most
  // topped with a giant copy of what the shop sells.
  // ---------------------------------------------------------------------------
  function sign(id, x, y, size) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + size / 100 + ')"><g stroke-width="7">' + PRODUCTS[id] + '</g></g>';
  }

  const DOOR_DOT = '<circle cx="54" cy="76" r="1.5" fill="' + INK + '"/>';

  const BUILDINGS = {
    storefront: function (c, id) {
      return shadow + '<path d="M40 46v-6M60 46v-6" fill="none"/>' + sign(id, 29, -1, 42) +
        '<rect x="14" y="48" width="72" height="38" fill="' + c.body + '"/>' +
        awning(12, 46, 76, 11, 6, c.a1, c.a2) +
        '<rect x="42" y="64" width="16" height="22" rx="2" fill="' + c.door + '"/>' + DOOR_DOT +
        '<rect x="20" y="64" width="15" height="11" rx="2" fill="#9BE7FF"/><rect x="65" y="64" width="15" height="11" rx="2" fill="#9BE7FF"/>';
    },
    cottage: function (c, id) {
      return shadow + sign(id, 33, -2, 34) +
        '<rect x="18" y="52" width="64" height="34" fill="' + c.body + '"/>' +
        '<path d="M10 56q40-44 80 0z" fill="' + c.roof + '"/>' +
        '<path d="M43 86V73a7 7 0 0 1 14 0v13z" fill="' + c.door + '"/>' +
        '<circle cx="30" cy="68" r="6" fill="#9BE7FF"/><circle cx="70" cy="68" r="6" fill="#9BE7FF"/>' +
        (c.flowers ? '<path d="M20 78h20M60 78h20" fill="none" stroke="#3DDC97" stroke-width="5"/>' +
          '<circle cx="24" cy="75" r="3" fill="#FF5FA2"/><circle cx="33" cy="75" r="3" fill="#FFE14D"/><circle cx="67" cy="75" r="3" fill="#8C6CFF"/><circle cx="76" cy="75" r="3" fill="#FF5FA2"/>' : '');
    },
    stall: function (c, id) {
      return shadow +
        '<rect x="22" y="30" width="6" height="56" fill="#C98B4F"/><rect x="72" y="30" width="6" height="56" fill="#C98B4F"/>' +
        '<rect x="10" y="14" width="80" height="9" rx="4" fill="' + c.roof + '"/>' + awning(12, 22, 76, 14, 8, c.a1, c.a2) +
        sign(id, 26, 42, 16) + sign(id, 58, 42, 16) +
        '<rect x="14" y="58" width="72" height="28" rx="4" fill="' + c.body + '"/>' + sign(id, 37, 58, 26);
    },
    cart: function (c, id) {
      return shadow + '<path d="M50 50V22" fill="none"/>' +
        '<path d="M16 28Q50-6 84 28z" fill="' + c.roof + '"/>' +
        '<path d="M16 28q5 6 11.3 0q5.7 6 11.3 0q5.7 6 11.4 0q5.7 6 11.3 0q5.7 6 11.4 0q5.7 6 11.3 0" fill="none"/>' +
        '<rect x="16" y="50" width="66" height="28" rx="7" fill="' + c.body + '"/><path d="M82 58l10-8" fill="none"/>' +
        '<circle cx="32" cy="82" r="8" fill="' + c.wheel + '"/><circle cx="68" cy="82" r="8" fill="' + c.wheel + '"/>' +
        sign(id, 37, 50, 26);
    },
    truck: function (c, id) {
      return shadow + sign(id, 26, 0, 36) +
        '<rect x="8" y="38" width="66" height="42" rx="6" fill="' + c.body + '"/>' +
        '<path d="M74 52h12q8 0 8 10v18h-20z" fill="' + c.trim + '"/><rect x="80" y="56" width="10" height="9" rx="2" fill="#9BE7FF"/>' +
        '<rect x="16" y="48" width="44" height="16" rx="2" fill="#FFF7D6"/><rect x="13" y="43" width="50" height="5" rx="2" fill="' + c.trim + '"/>' +
        '<path d="M10 71h62" fill="none" stroke="' + c.trim + '" stroke-width="4"/>' +
        '<circle cx="26" cy="82" r="8" fill="' + INK + '"/><circle cx="78" cy="82" r="8" fill="' + INK + '"/>' +
        '<circle cx="26" cy="82" r="3" fill="#FFFFFF" stroke="none"/><circle cx="78" cy="82" r="3" fill="#FFFFFF" stroke="none"/>';
    },
    boat: function (c, id) {
      return '<path d="M0 84q12-8 25 0t25 0t25 0t25 0v16h-100z" fill="#4CC9F0"/>' +
        (c.mast ? '<path d="M80 66V8" fill="none"/><path d="M80 10l16 7l-16 7z" fill="' + c.flag + '"/>' : '') +
        '<rect x="28" y="46" width="44" height="22" rx="3" fill="' + c.cabin + '"/>' +
        '<circle cx="40" cy="57" r="5" fill="#9BE7FF"/><circle cx="60" cy="57" r="5" fill="#9BE7FF"/>' + sign(id, 33, 10, 34) +
        '<path d="M8 66h84l-12 20h-60z" fill="' + c.hull + '"/><path d="M15 74h70" fill="none" stroke="#FFFFFF" stroke-width="3"/>';
    },
    castle: function (c, id) {
      return shadow +
        '<path d="M19 14v-8l7 3l-7 3" fill="' + c.flag + '"/><path d="M81 14v-8l7 3l-7 3" fill="' + c.flag + '"/>' +
        '<path d="M8 32l11-18l11 18z" fill="' + c.roof + '"/><path d="M70 32l11-18l11 18z" fill="' + c.roof + '"/>' +
        '<rect x="10" y="32" width="18" height="54" fill="' + c.tower + '"/><rect x="72" y="32" width="18" height="54" fill="' + c.tower + '"/>' +
        '<rect x="15" y="44" width="8" height="10" rx="4" fill="#9BE7FF"/><rect x="77" y="44" width="8" height="10" rx="4" fill="#9BE7FF"/>' +
        sign(id, 33, 4, 34) +
        '<path d="M26 86V48h8v-6h8v6h8v-6h8v6h8v-6h8v6V86z" fill="' + c.wall + '"/>' +
        '<path d="M42 86V72a8 8 0 0 1 16 0v14z" fill="#8B4A2B"/>';
    },
    windmill: function (c, id) {
      let blades = '';
      [20, 110, 200, 290].forEach(function (a) {
        blades += '<rect x="46" y="2" width="8" height="28" rx="3" fill="' + c.blade + '" transform="rotate(' + a + ' 50 30)"/>';
      });
      return shadow + '<path d="M30 86L36 42h28l6 44z" fill="' + c.body + '"/><path d="M32 44L50 26L68 44z" fill="' + c.roof + '"/>' +
        blades + '<circle cx="50" cy="30" r="4" fill="' + c.roof + '"/>' + sign(id, 40, 50, 20) +
        '<path d="M44 86V79a6 6 0 0 1 12 0v7z" fill="#8B4A2B"/>';
    },
    museum: function (c, id) {
      let cols = '';
      [18, 34, 58, 74].forEach(function (x) { cols += '<rect x="' + x + '" y="54" width="8" height="24" fill="' + c.body + '"/>'; });
      return shadow + sign(id, 36, 0, 28) +
        '<path d="M10 48L50 26L90 48z" fill="' + c.roof + '"/><rect x="12" y="48" width="76" height="6" fill="' + c.body + '"/>' + cols +
        '<rect x="44" y="60" width="12" height="18" rx="2" fill="#8B4A2B"/><rect x="8" y="78" width="84" height="8" fill="' + c.body + '"/>';
    },
    tent: function (c, id) {
      return shadow + '<path d="M50 16V4" fill="none"/><path d="M50 4l12 4l-12 4z" fill="' + c.flag + '"/>' +
        '<path d="M14 86L22 48H78L86 86z" fill="' + c.a2 + '"/>' +
        '<path d="M30 48h10l-2 38h-12zM45 48h10v38h-10zM60 48h10l4 38h-12z" fill="' + c.a1 + '" stroke="none"/>' +
        '<path d="M14 86L22 48H78L86 86z" fill="none"/>' +
        '<path d="M18 50L50 16L82 50z" fill="' + c.a1 + '"/><path d="M50 16L38 50h10zM50 16L60 50h10z" fill="' + c.a2 + '" stroke="none"/>' +
        '<path d="M18 50L50 16L82 50z" fill="none"/>' + sign(id, 38, 58, 24);
    },
    // Boardwalk styles
    tiki: function (c, id) {
      let fringe = 'M8 50';
      for (let x = 8; x < 92; x += 7) fringe += 'l3.5 8l3.5-8';
      return shadow +
        '<rect x="20" y="50" width="7" height="36" fill="#A0643C"/><rect x="73" y="50" width="7" height="36" fill="#A0643C"/>' +
        '<rect x="14" y="58" width="72" height="22" rx="3" fill="' + c.body + '"/>' +
        '<path d="M26 58v22M38 58v22M50 58v22M62 58v22M74 58v22" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".55"/>' +
        '<rect x="14" y="58" width="72" height="22" rx="3" fill="none"/>' +
        '<path d="M6 50L50 12L94 50z" fill="' + c.roof + '"/><path d="' + fringe + 'z" fill="' + c.roof + '"/>' +
        '<path d="M28 40l8-10M44 44l6-12M64 40l-6-10" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".5"/>' +
        sign(id, 37, 24, 26) + sign(id, 42, 61, 16);
    },
    ferris: function (c, id) {
      let spokes = '', cars = '';
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, x = (50 + Math.cos(a) * 34).toFixed(1), y = (40 + Math.sin(a) * 34).toFixed(1);
        spokes += 'M50 40L' + x + ' ' + y;
        cars += '<rect x="' + (x - 6) + '" y="' + y + '" width="12" height="10" rx="3" fill="' + (k % 2 ? c.c1 : c.c2) + '" stroke-width="2.5"/>';
      }
      return shadow + '<path d="M50 40L30 86M50 40L70 86" fill="none" stroke-width="6"/><path d="M50 40L30 86M50 40L70 86" fill="none" stroke="#FFFFFF" stroke-width="2"/>' +
        '<path d="' + spokes + '" fill="none" stroke-width="2"/>' +
        '<circle cx="50" cy="40" r="34" fill="none" stroke-width="9"/><circle cx="50" cy="40" r="34" fill="none" stroke="' + c.rim + '" stroke-width="4"/>' +
        cars + '<circle cx="50" cy="40" r="11" fill="#FFFFFF"/>' + sign(id, 42, 32, 16) +
        '<rect x="36" y="70" width="28" height="16" rx="3" fill="' + c.booth + '"/>' + awning(34, 66, 32, 7, 4, c.rim, '#FFFFFF');
    },
    dome: function (c, id) {
      return shadow + '<rect x="10" y="60" width="80" height="26" rx="3" fill="' + c.body + '"/>' +
        (c.antenna ? '<path d="M50 26V12" fill="none"/><circle cx="50" cy="10" r="4.5" fill="#FF5FA2"/>' : '') +
        '<path d="M16 60a34 34 0 0 1 68 0z" fill="' + c.dome + '"/>' + sign(id, 35, 31, 30) +
        '<path d="M50 26v34M33 31q8 14 6 29M67 31q-8 14-6 29" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".7"/>' +
        '<path d="M16 60a34 34 0 0 1 68 0z" fill="none"/><path d="M25 44q3-9 12-13" fill="none" stroke="#FFFFFF" stroke-width="4"/>' +
        (c.ring ? '<ellipse cx="50" cy="60" rx="45" ry="7" fill="' + c.ring + '"/><circle cx="20" cy="60" r="2.5" fill="#FFE14D"/><circle cx="35" cy="62" r="2.5" fill="#FFE14D"/>' +
          '<circle cx="50" cy="63" r="2.5" fill="#FFE14D"/><circle cx="65" cy="62" r="2.5" fill="#FFE14D"/><circle cx="80" cy="60" r="2.5" fill="#FFE14D"/>' : '') +
        '<rect x="42" y="68" width="16" height="18" rx="2" fill="' + c.door + '"/>' +
        '<circle cx="24" cy="75" r="5" fill="#9BE7FF"/><circle cx="76" cy="75" r="5" fill="#9BE7FF"/>';
    },
    lighthouse: function (c, id) {
      return shadow + '<path d="M60 16L96 6v22z" fill="#FFF07A" opacity=".7" stroke="none"/>' +
        '<path d="M36 86L40 30h20l4 56z" fill="#FFFFFF"/>' +
        '<path d="M39 44h22l.7 10h-23.4zM37.6 64h24.8l.7 10h-26.2z" fill="' + c.stripe + '" stroke="none"/>' +
        '<path d="M36 86L40 30h20l4 56z" fill="none"/>' +
        '<rect x="42" y="14" width="16" height="14" rx="2" fill="#FFF07A"/><path d="M38 14L50 2L62 14z" fill="' + c.trim + '"/>' +
        '<rect x="34" y="27" width="32" height="6" rx="2" fill="' + c.trim + '"/>' +
        '<path d="M45 86V77a5 5 0 0 1 10 0v9z" fill="#8B4A2B"/>' +
        '<rect x="62" y="62" width="30" height="24" rx="2" fill="' + c.body + '"/>' + awning(60, 58, 34, 8, 4, c.a1, '#FFFFFF') + sign(id, 68, 66, 18) +
        '<rect x="8" y="70" width="22" height="16" rx="2" fill="' + c.body + '"/><rect x="13" y="74" width="12" height="8" rx="2" fill="#9BE7FF"/>';
    },
    factory: function (c, id) {
      return shadow +
        '<rect x="68" y="12" width="12" height="36" fill="' + c.chimney + '"/><path d="M68 22h12M68 32h12" fill="none" stroke="' + c.stripe + '" stroke-width="4"/>' +
        '<rect x="68" y="12" width="12" height="36" fill="none"/><rect x="65" y="8" width="18" height="6" rx="2" fill="' + c.chimney + '"/>' +
        '<path d="M10 46V28l18 18V28l18 18V28l18 18z" fill="' + c.roof + '"/>' +
        '<rect x="10" y="46" width="80" height="40" fill="' + c.body + '"/>' +
        '<rect x="16" y="54" width="14" height="11" rx="2" fill="#9BE7FF"/><rect x="36" y="54" width="14" height="11" rx="2" fill="#9BE7FF"/>' +
        '<rect x="18" y="70" width="30" height="16" fill="' + c.door + '"/><path d="M18 75h30M18 80h30" fill="none" stroke-width="2"/>' +
        sign(id, 58, 52, 28);
    },
  };

  // Building style and colors for each Sprinkle Street shop.
  const STREET_ART = {
    cupcake:     ['storefront', { body: '#FFE3F1', a1: '#FF8FC7', a2: '#FFFFFF', door: '#8C6CFF' }],
    bubbletea:   ['storefront', { body: '#E9F7EF', a1: '#3DDC97', a2: '#FFFFFF', door: '#C98B4F' }],
    cottoncandy: ['cart',       { body: '#C9B6FF', roof: '#FF8FC7', wheel: '#4CC9F0' }],
    popsicle:    ['stall',      { body: '#F6C177', a1: '#4CC9F0', a2: '#FFFFFF', roof: '#FF5FA2' }],
    pancake:     ['cottage',    { body: '#FFF3D6', roof: '#E89B4A', door: '#8B4A2B' }],
    taco:        ['truck',      { body: '#FFD23F', trim: '#FF5A5F' }],
    sushi:       ['boat',       { hull: '#FF6B6B', cabin: '#FFFFFF' }],
    cookie:      ['castle',     { wall: '#E8A25B', tower: '#F6C177', roof: '#8B4A2B', flag: '#FF5FA2' }],
    waffle:      ['windmill',   { body: '#FFE3A3', roof: '#FF9F43', blade: '#FFFFFF' }],
    pets:        ['cottage',    { body: '#E4F1FF', roof: '#5B8CFF', door: '#FF9F43' }],
    flowers:     ['cottage',    { body: '#FFF0F6', roof: '#3DDC97', door: '#FF5FA2', flowers: true }],
    comics:      ['storefront', { body: '#FFF8DC', a1: '#FF5A5F', a2: '#FFE14D', door: '#5B8CFF' }],
    arcade:      ['storefront', { body: '#4A3F8F', a1: '#FF5FA2', a2: '#4CC9F0', door: '#FFE14D' }],
    music:       ['storefront', { body: '#EDE7FF', a1: '#8C6CFF', a2: '#FFFFFF', door: '#FF9F43' }],
    skate:       ['truck',      { body: '#FF9F43', trim: '#2B2147' }],
    magic:       ['tent',       { a1: '#8C6CFF', a2: '#FFFFFF', flag: '#FFE14D' }],
    dino:        ['museum',     { body: '#F1EAD8', roof: '#C9B99A' }],
    pirate:      ['boat',       { hull: '#8B4A2B', cabin: '#C98B4F', mast: true, flag: '#2B2147' }],
    dragon:      ['castle',     { wall: '#FF8A65', tower: '#FF6B6B', roof: '#5ED38A', flag: '#FFE14D' }],
    unicorn:     ['castle',     { wall: '#FFF0F6', tower: '#E4DBFF', roof: '#FF8FC7', flag: '#C77DFF' }],
    // Boardwalk
    shaveice:    ['tiki',       { body: '#A6E9FF', roof: '#F6C177' }],
    hotdog:      ['stall',      { body: '#FFD23F', a1: '#FF6B6B', a2: '#FFFFFF', roof: '#FF6B6B' }],
    pretzel:     ['cart',       { body: '#E8A25B', roof: '#FF5A5F', wheel: '#FFD23F' }],
    surf:        ['tiki',       { body: '#5EE6C8', roof: '#E8B97A' }],
    taffy:       ['factory',    { body: '#FFD6EC', roof: '#FF8FC7', chimney: '#FFFFFF', stripe: '#FF5FA2', door: '#8C6CFF' }],
    fishchips:   ['boat',       { hull: '#4C5FA8', cabin: '#FFF3D6' }],
    ferris:      ['ferris',     { rim: '#FF5FA2', c1: '#FFD23F', c2: '#4CC9F0', booth: '#FFF3D6' }],
    carousel:    ['tent',       { a1: '#FFB627', a2: '#FFFFFF', flag: '#FF5FA2' }],
    aquarium:    ['dome',       { body: '#4CC9F0', dome: '#BDEBFF', door: '#FFD23F' }],
    lighthouse:  ['lighthouse', { stripe: '#FF5A5F', trim: '#4C5FA8', body: '#FFF3D6', a1: '#FF5A5F' }],
    kites:       ['factory',    { body: '#DDE8FF', roof: '#5B8CFF', chimney: '#FFD23F', stripe: '#FF5FA2', door: '#FF9F43' }],
    sandcastle:  ['castle',     { wall: '#F6D7A7', tower: '#FFE3A3', roof: '#E8A25B', flag: '#4CC9F0' }],
    duckboats:   ['boat',       { hull: '#FFD23F', cabin: '#FFFFFF', mast: true, flag: '#FF9F43' }],
    circus:      ['tent',       { a1: '#FF5A5F', a2: '#FFFFFF', flag: '#FFD23F' }],
    fireworks:   ['stall',      { body: '#4A3F8F', a1: '#FF5FA2', a2: '#FFD23F', roof: '#8C6CFF' }],
    funhouse:    ['castle',     { wall: '#8A82B8', tower: '#6B5BAE', roof: '#3E3A55', flag: '#3DDC97' }],
    bumper:      ['dome',       { body: '#FF9F43', dome: '#FFE3A3', door: '#5B8CFF' }],
    pearl:       ['storefront', { body: '#F3EEFF', a1: '#B07DFF', a2: '#FFFFFF', door: '#4CC9F0' }],
    jellybean:   ['factory',    { body: '#E3FFD6', roof: '#3DDC97', chimney: '#FF5FA2', stripe: '#FFFFFF', door: '#FFD23F' }],
    planetarium: ['dome',       { body: '#5B4BB7', dome: '#8FA8FF', door: '#FFD23F', antenna: true }],
    mermaid:     ['castle',     { wall: '#7FE0D0', tower: '#B8F2E6', roof: '#FF8FC7', flag: '#FFD23F' }],
    ufo:         ['dome',       { body: '#6B5BAE', dome: '#C9F7FF', door: '#FF5FA2', ring: '#C9C3E6' }],
    balloonport: ['museum',     { body: '#FFF3D6', roof: '#FF9F43' }],
    dreampalace: ['castle',     { wall: '#E9D5FF', tower: '#C9B6FF', roof: '#FFC93C', flag: '#FF8FC7' }],
  };

  // ---------------------------------------------------------------------------
  // Storefront looks (a Customization): repaint a whole building drawing by
  // mapping every color in it. shop() draws the look in use.
  // ---------------------------------------------------------------------------
  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function toHex(c) {
    return '#' + c.map(function (v) { return ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2); }).join('').toUpperCase();
  }
  function blend(a, b, t) { return a.map(function (v, k) { return v + (b[k] - v) * t; }); }
  function lum(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  // Piecewise-linear color ramp over brightness: stops are [at, [r, g, b]].
  function ramp(stops, x) {
    for (let k = 1; k < stops.length; k++) {
      if (x <= stops[k][0]) return blend(stops[k - 1][1], stops[k][1], (x - stops[k - 1][0]) / (stops[k][0] - stops[k - 1][0]));
    }
    return stops[stops.length - 1][1];
  }
  // Each look maps one color; ink is the outline color, window is the light blue of the windows.
  const FRONTS = {
    classic: null,
    pastel: function (c, ink) { return ink ? c : blend(c, [255, 255, 255], 0.5); },
    gingerbread: function (c, ink) {
      if (ink) return [92, 44, 22];
      const L = lum(c);
      return L > 0.8 ? [255, 250, 240] : ramp([[0, [122, 62, 29]], [0.8, [228, 160, 92]]], L);
    },
    frosty: function (c, ink) { return ink ? [47, 74, 122] : blend(c, [214, 242, 255], 0.55); },
    neon: function (c, ink, window) {
      if (ink) return [108, 246, 255];
      if (window) return [255, 240, 122];
      return blend(c, [34, 26, 72], 0.62);
    },
    gold: function (c, ink) { return ink ? c : ramp([[0, [138, 90, 0]], [0.55, [255, 201, 60]], [1, [255, 246, 201]]], lum(c)); },
  };
  let frontStyle = 'classic';
  function setFrontStyle(style) { frontStyle = style in FRONTS ? style : 'classic'; }

  function restyle(text, style) {
    const f = FRONTS[style];
    if (!f) return text;
    return text.replace(/#[0-9A-Fa-f]{6}\b/g, function (h) {
      const up = h.toUpperCase();
      return toHex(f(rgb(up), up === INK, up === '#9BE7FF'));
    });
  }

  // A shop or factory building, in the chosen storefront look (or the one given).
  function shop(id, style) {
    let out;
    if (SHOPS[id]) out = svg(SHOPS[id](), '');
    else out = svg(BUILDINGS[STREET_ART[id][0]](STREET_ART[id][1], id), '');
    return restyle(out, style || frontStyle);
  }

  // A delivery van in one of the Trucks & Vans paint jobs, for previews.
  function van(paint) {
    const body = 'M8 34h52v34h-52z';
    let fill;
    if (paint === 'stripes') {
      fill = '<clipPath id="vanStripes"><path d="' + body + '"/></clipPath><path d="' + body + '" fill="#FFFFFF" stroke="none"/>' +
        '<path d="M0 74L34 24M18 74L52 24M36 74L70 24" fill="none" stroke="#FF5FA2" stroke-width="8" clip-path="url(#vanStripes)"/>';
    } else if (paint === 'rainbow') {
      fill = ['#FF5A5F', '#FFB627', '#FFE14D', '#3DDC97', '#4CC9F0', '#8C6CFF'].map(function (c, k) {
        return '<rect x="8" y="' + (34 + k * 34 / 6).toFixed(1) + '" width="52" height="' + (34 / 6 + 0.3).toFixed(1) + '" fill="' + c + '" stroke="none"/>';
      }).join('');
    } else {
      const c = paint === 'mint' ? '#5EE6B5' : paint === 'gold' ? '#FFD23F' : '#FF8FC7';
      fill = '<path d="' + body + '" fill="' + c + '" stroke="none"/>' + (paint === 'gold' ? '<path d="M14 40l10 0M14 46l20 0" fill="none" stroke="#FFF6C9" stroke-width="4"/>' : '');
    }
    return svg(fill + '<path d="' + body + '" fill="none"/>' +
      '<path d="M60 44h18q12 0 14 14v10h-32z" fill="#FFFFFF"/><path d="M66 48h10q6 0 8 8h-18z" fill="#9BE7FF"/>' +
      '<circle cx="24" cy="70" r="9" fill="' + INK + '"/><circle cx="74" cy="70" r="9" fill="' + INK + '"/>' +
      '<circle cx="24" cy="70" r="3" fill="#FFFFFF" stroke="none"/><circle cx="74" cy="70" r="3" fill="#FFFFFF" stroke="none"/>', '');
  }

  function mystery() {
    return svg('<path d="M24 70a16 16 0 0 1 2-30a20 20 0 0 1 38-6a16 16 0 0 1 12 36z" fill="#FFFFFF"/>' +
      '<path d="M42 44q0-10 9-10t9 8q0 6-8 9v5" fill="none" stroke-width="5"/><circle cx="52" cy="64" r="2.5" fill="' + INK + '"/>', '');
  }

  // ---------------------------------------------------------------------------
  // Manager faces
  // ---------------------------------------------------------------------------
  function eyes(y, gap) {
    gap = gap || 10;
    return '<circle cx="' + (50 - gap) + '" cy="' + y + '" r="4.2" fill="' + INK + '" stroke="none"/><circle cx="' + (50 + gap) + '" cy="' + y + '" r="4.2" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="' + (51.5 - gap) + '" cy="' + (y - 1.5) + '" r="1.4" fill="#FFFFFF" stroke="none"/><circle cx="' + (51.5 + gap) + '" cy="' + (y - 1.5) + '" r="1.4" fill="#FFFFFF" stroke="none"/>';
  }
  const cheeks = '<ellipse cx="31" cy="64" rx="5" ry="3.2" fill="#FF7EB6" opacity=".55" stroke="none"/><ellipse cx="69" cy="64" rx="5" ry="3.2" fill="#FF7EB6" opacity=".55" stroke="none"/>';
  const smile = '<path d="M44 66q6 6 12 0" fill="none"/>';
  const head = function (c) { return '<circle cx="50" cy="56" r="30" fill="' + c + '"/>'; };

  const ANIMALS = {
    cat: function (c) {
      return '<path d="M24 46l2-30l20 14z" fill="' + c + '"/><path d="M76 46l-2-30l-20 14z" fill="' + c + '"/>' +
        '<path d="M28 38l1-14l9 7z" fill="#FFB3C8" stroke="none"/><path d="M72 38l-1-14l-9 7z" fill="#FFB3C8" stroke="none"/>' +
        head(c) + eyes(52) + cheeks + '<path d="M47 60h6l-3 3z" fill="#FF7EB6" stroke-width="2"/>' + smile +
        '<path d="M14 58l14 2M14 66l14-2M86 58l-14 2M86 66l-14-2" fill="none" stroke-width="2"/>';
    },
    bear: function (c) {
      return '<circle cx="26" cy="32" r="11" fill="' + c + '"/><circle cx="74" cy="32" r="11" fill="' + c + '"/>' +
        '<circle cx="26" cy="32" r="5" fill="#F3C9A0" stroke="none"/><circle cx="74" cy="32" r="5" fill="#F3C9A0" stroke="none"/>' +
        head(c) + '<ellipse cx="50" cy="66" rx="13" ry="10" fill="#F3C9A0"/>' + eyes(50) +
        '<ellipse cx="50" cy="61" rx="5" ry="3.5" fill="' + INK + '"/>' + '<path d="M45 68q5 5 10 0" fill="none"/>' + cheeks;
    },
    bunny: function (c) {
      return '<ellipse cx="38" cy="20" rx="8" ry="20" fill="' + c + '"/><ellipse cx="62" cy="20" rx="8" ry="20" fill="' + c + '"/>' +
        '<ellipse cx="38" cy="22" rx="3.5" ry="13" fill="#FFB3C8" stroke="none"/><ellipse cx="62" cy="22" rx="3.5" ry="13" fill="#FFB3C8" stroke="none"/>' +
        head(c) + eyes(54) + cheeks + '<ellipse cx="50" cy="62" rx="3.5" ry="2.5" fill="#FF7EB6" stroke-width="2"/>' +
        '<path d="M50 64v4M44 68q3 3 6 0q3 3 6 0" fill="none" stroke-width="2.5"/>' +
        '<rect x="46" y="70" width="8" height="6" rx="1" fill="#FFFFFF" stroke-width="2"/>';
    },
    penguin: function (c) {
      return head(c) +
        '<path d="M50 44c-4-8-24-8-24 10c0 14 10 24 24 24s24-10 24-24c0-18-20-18-24-10z" fill="#FFFFFF"/>' +
        eyes(54) + '<path d="M44 62l6 7l6-7z" fill="#FF9F43"/>' + cheeks;
    },
    pig: function (c) {
      return '<path d="M26 40l-6-20l20 8z" fill="' + c + '"/><path d="M74 40l6-20l-20 8z" fill="' + c + '"/>' +
        head(c) + eyes(50, 12) + cheeks +
        '<ellipse cx="50" cy="63" rx="11" ry="8" fill="#FF8FB1"/><ellipse cx="46" cy="63" rx="2" ry="3" fill="' + INK + '" stroke="none"/><ellipse cx="54" cy="63" rx="2" ry="3" fill="' + INK + '" stroke="none"/>' +
        '<path d="M45 75q5 3 10 0" fill="none"/>';
    },
    fox: function (c) {
      return '<path d="M22 46l0-32l24 16z" fill="' + c + '"/><path d="M78 46l0-32l-24 16z" fill="' + c + '"/>' +
        '<path d="M22 14l0 10l7-5z" fill="' + INK + '" stroke="none"/><path d="M78 14l0 10l-7-5z" fill="' + INK + '" stroke="none"/>' +
        head(c) +
        '<path d="M20 58q14 2 22 14q-6 12-16 4q-6-8-6-18z" fill="#FFFFFF"/><path d="M80 58q-14 2-22 14q6 12 16 4q6-8 6-18z" fill="#FFFFFF"/>' +
        '<path d="M42 70q8 14 16 0q-8-4-16 0z" fill="#FFFFFF" stroke="none"/>' +
        eyes(52) + '<ellipse cx="50" cy="64" rx="4" ry="3" fill="' + INK + '"/>' + '<path d="M45 70q5 4 10 0" fill="none"/>';
    },
    frog: function (c) {
      return '<ellipse cx="50" cy="60" rx="34" ry="26" fill="' + c + '"/>' +
        '<circle cx="32" cy="34" r="13" fill="' + c + '"/><circle cx="68" cy="34" r="13" fill="' + c + '"/>' +
        '<circle cx="32" cy="34" r="8" fill="#FFFFFF"/><circle cx="68" cy="34" r="8" fill="#FFFFFF"/>' +
        '<circle cx="33" cy="35" r="4" fill="' + INK + '" stroke="none"/><circle cx="69" cy="35" r="4" fill="' + INK + '" stroke="none"/>' +
        '<path d="M30 62q20 18 40 0" fill="none"/>' + cheeks;
    },
    panda: function (c) {
      return '<circle cx="26" cy="32" r="11" fill="' + INK + '"/><circle cx="74" cy="32" r="11" fill="' + INK + '"/>' +
        head(c) +
        '<ellipse cx="38" cy="53" rx="8" ry="10" transform="rotate(30 38 53)" fill="' + INK + '" stroke="none"/><ellipse cx="62" cy="53" rx="8" ry="10" transform="rotate(-30 62 53)" fill="' + INK + '" stroke="none"/>' +
        '<circle cx="39" cy="52" r="3" fill="#FFFFFF" stroke="none"/><circle cx="61" cy="52" r="3" fill="#FFFFFF" stroke="none"/>' +
        '<ellipse cx="50" cy="63" rx="4" ry="3" fill="' + INK + '"/>' + '<path d="M45 69q5 4 10 0" fill="none"/>' + cheeks;
    },
    mouse: function (c) {
      return '<circle cx="24" cy="30" r="16" fill="' + c + '"/><circle cx="76" cy="30" r="16" fill="' + c + '"/>' +
        '<circle cx="24" cy="30" r="9" fill="#FFB3C8" stroke="none"/><circle cx="76" cy="30" r="9" fill="#FFB3C8" stroke="none"/>' +
        head(c) + eyes(52) + cheeks + '<circle cx="50" cy="62" r="4" fill="#FF7EB6"/>' + '<path d="M45 68q5 4 10 0" fill="none"/>' +
        '<path d="M14 58l16 3M14 66l16-1M86 58l-16 3M86 66l-16-1" fill="none" stroke-width="2"/>' +
        '<path d="M18 40a34 34 0 0 1 64 0" fill="none" stroke="#9BE7FF" stroke-width="4" opacity=".9"/>';
    },
    dog: function (c) {
      return head(c) +
        '<path d="M24 34q-14 4-10 26q4 8 12 2q2-14 6-24z" fill="#9C6B3F"/><path d="M76 34q14 4 10 26q-4 8-12 2q-2-14-6-24z" fill="#9C6B3F"/>' +
        '<ellipse cx="50" cy="66" rx="13" ry="10" fill="#FFF3E0"/>' + eyes(50) +
        '<ellipse cx="50" cy="61" rx="5.5" ry="4" fill="' + INK + '"/>' + '<path d="M45 68q5 4 10 0" fill="none"/>' +
        '<path d="M48 70q2 8 6 0" fill="#FF7EB6" stroke-width="2"/>' + cheeks;
    },
    owl: function (c) {
      return '<path d="M24 40l-2-22l16 12z" fill="' + c + '"/><path d="M76 40l2-22l-16 12z" fill="' + c + '"/>' + head(c) +
        '<circle cx="39" cy="52" r="11" fill="#FFFFFF"/><circle cx="61" cy="52" r="11" fill="#FFFFFF"/>' + eyes(52, 11) +
        '<path d="M45 62l5 8l5-8z" fill="#FF9F43"/><path d="M36 77q14 6 28 0" fill="none" stroke="#8A5A33" stroke-width="2.5"/>';
    },
    lion: function (c) {
      let mane = '';
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6;
        mane += '<circle cx="' + (50 + Math.cos(a) * 31).toFixed(1) + '" cy="' + (56 + Math.sin(a) * 31).toFixed(1) + '" r="10" fill="#E07A2E"/>';
      }
      return mane + '<circle cx="29" cy="35" r="7" fill="' + c + '"/><circle cx="71" cy="35" r="7" fill="' + c + '"/>' +
        '<circle cx="50" cy="56" r="27" fill="' + c + '"/>' + eyes(51) + cheeks +
        '<ellipse cx="50" cy="65" rx="11" ry="8" fill="#FFF3D6"/><path d="M46 60h8l-4 4z" fill="' + INK + '"/><path d="M45 68q5 4 10 0" fill="none"/>';
    },
    koala: function (c) {
      return '<circle cx="22" cy="36" r="16" fill="' + c + '"/><circle cx="78" cy="36" r="16" fill="' + c + '"/>' +
        '<circle cx="22" cy="36" r="8" fill="#F4F0FF" stroke="none"/><circle cx="78" cy="36" r="8" fill="#F4F0FF" stroke="none"/>' +
        head(c) + eyes(50, 13) + cheeks + '<ellipse cx="50" cy="62" rx="8" ry="11" fill="' + INK + '"/><path d="M44 78q6 3 12 0" fill="none"/>';
    },
    elephant: function (c) {
      return '<ellipse cx="20" cy="54" rx="16" ry="22" fill="' + c + '"/><ellipse cx="80" cy="54" rx="16" ry="22" fill="' + c + '"/>' +
        '<ellipse cx="20" cy="54" rx="9" ry="14" fill="#FFB3C8" stroke="none"/><ellipse cx="80" cy="54" rx="9" ry="14" fill="#FFB3C8" stroke="none"/>' +
        head(c) + eyes(48, 11) + cheeks + '<path d="M43 56q-1 24 11 30q6 2 6-4q-6-2-7-10v-16z" fill="' + c + '"/>';
    },
    raccoon: function (c) {
      return '<path d="M24 42l2-24l18 12z" fill="' + c + '"/><path d="M76 42l-2-24l-18 12z" fill="' + c + '"/>' +
        '<path d="M28 36l1-12l9 6z" fill="' + INK + '" stroke="none"/><path d="M72 36l-1-12l-9 6z" fill="' + INK + '" stroke="none"/>' +
        head(c) + '<path d="M22 52q14-12 28-2q14-10 28 2q-6 10-14 8q-8-2-14-2q-6 0-14 2q-8 2-14-8z" fill="#3E3A55"/>' +
        '<circle cx="39" cy="53" r="3.6" fill="#FFFFFF" stroke="none"/><circle cx="61" cy="53" r="3.6" fill="#FFFFFF" stroke="none"/>' +
        '<circle cx="39.5" cy="53" r="2" fill="' + INK + '" stroke="none"/><circle cx="61.5" cy="53" r="2" fill="' + INK + '" stroke="none"/>' +
        '<ellipse cx="50" cy="69" rx="12" ry="8" fill="#FFFFFF"/><ellipse cx="50" cy="65" rx="4.5" ry="3.2" fill="' + INK + '"/><path d="M46 71q4 3 8 0" fill="none"/>';
    },
    sheep: function (c) {
      let wool = '';
      [[30, 32], [42, 24], [58, 24], [70, 32], [24, 46], [76, 46]].forEach(function (p) {
        wool += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="11" fill="#FFFFFF"/>';
      });
      return '<ellipse cx="16" cy="58" rx="10" ry="6" transform="rotate(20 16 58)" fill="' + c + '"/><ellipse cx="84" cy="58" rx="10" ry="6" transform="rotate(-20 84 58)" fill="' + c + '"/>' +
        wool + '<ellipse cx="50" cy="61" rx="22" ry="25" fill="' + c + '"/><circle cx="50" cy="36" r="12" fill="#FFFFFF"/>' +
        eyes(57, 9) + '<ellipse cx="50" cy="71" rx="5" ry="3.5" fill="#FF7EB6"/><path d="M45 77q5 4 10 0" fill="none"/>' +
        '<ellipse cx="35" cy="66" rx="4" ry="2.6" fill="#FF7EB6" opacity=".55" stroke="none"/><ellipse cx="65" cy="66" rx="4" ry="2.6" fill="#FF7EB6" opacity=".55" stroke="none"/>';
    },
  };

  // New faces for Sprinkle Street managers.
  ANIMALS.cow = function (c) {
    return '<ellipse cx="18" cy="44" rx="12" ry="7" transform="rotate(-20 18 44)" fill="' + c + '"/><ellipse cx="82" cy="44" rx="12" ry="7" transform="rotate(20 82 44)" fill="' + c + '"/>' +
      '<path d="M32 30l-5-13l11 7zM68 30l5-13l-11 7z" fill="#FFF3D6"/>' + head(c) +
      '<path d="M28 46q8-16 20-6q-4 12-20 6z" fill="#3E3A55" stroke="none"/><circle cx="70" cy="40" r="6" fill="#3E3A55" stroke="none"/>' +
      eyes(50, 11) + '<ellipse cx="50" cy="70" rx="16" ry="11" fill="#FFB3C8"/>' +
      '<ellipse cx="44" cy="70" rx="2.5" ry="3.5" fill="' + INK + '" stroke="none"/><ellipse cx="56" cy="70" rx="2.5" ry="3.5" fill="' + INK + '" stroke="none"/>';
  };
  ANIMALS.monkey = function (c) {
    return '<circle cx="20" cy="54" r="11" fill="' + c + '"/><circle cx="80" cy="54" r="11" fill="' + c + '"/>' +
      '<circle cx="20" cy="54" r="5" fill="#F3D3B0" stroke="none"/><circle cx="80" cy="54" r="5" fill="#F3D3B0" stroke="none"/>' + head(c) +
      '<path d="M50 44c-6-8-22-8-22 6c0 4 2 6 4 8c-4 4-6 8-6 12c0 10 12 16 24 16s24-6 24-16c0-4-2-8-6-12c2-2 4-4 4-8c0-14-16-14-22-6z" fill="#F3D3B0"/>' +
      eyes(52, 9) + '<circle cx="46" cy="64" r="1.6" fill="' + INK + '" stroke="none"/><circle cx="54" cy="64" r="1.6" fill="' + INK + '" stroke="none"/>' +
      '<path d="M42 70q8 7 16 0" fill="none"/>';
  };
  ANIMALS.hamster = function (c) {
    return '<circle cx="30" cy="32" r="9" fill="' + c + '"/><circle cx="70" cy="32" r="9" fill="' + c + '"/>' +
      '<circle cx="30" cy="32" r="4" fill="#FFB3C8" stroke="none"/><circle cx="70" cy="32" r="4" fill="#FFB3C8" stroke="none"/>' + head(c) +
      '<circle cx="28" cy="66" r="10" fill="#FFF3E6"/><circle cx="72" cy="66" r="10" fill="#FFF3E6"/><ellipse cx="50" cy="70" rx="18" ry="13" fill="#FFF3E6"/>' +
      eyes(50, 11) + '<ellipse cx="50" cy="60" rx="3.5" ry="2.5" fill="#FF7EB6" stroke-width="2"/>' +
      '<path d="M46 64q4 4 8 0" fill="none" stroke-width="2.5"/><rect x="47" y="66" width="6" height="6" rx="1" fill="#FFFFFF" stroke-width="2"/>';
  };
  ANIMALS.tiger = function (c) {
    return '<path d="M24 42l2-20l16 10z" fill="' + c + '"/><path d="M76 42l-2-20l-16 10z" fill="' + c + '"/>' + head(c) +
      '<path d="M50 26v10M42 28l3 8M58 28l-3 8M20 52h10M22 62h9M80 52h-10M78 62h-9" fill="none" stroke-width="3.5"/>' +
      '<ellipse cx="50" cy="68" rx="16" ry="11" fill="#FFFFFF"/>' + eyes(50) +
      '<path d="M45 61h10l-5 5z" fill="#FF7EB6" stroke-width="2"/><path d="M44 71q6 4 12 0" fill="none"/>';
  };
  ANIMALS.duck = function (c) {
    return '<path d="M50 28q-6-10 2-16q0 8 6 10" fill="' + c + '"/>' + head(c) + eyes(50, 11) + cheeks +
      '<ellipse cx="50" cy="66" rx="16" ry="8" fill="#FF9F43"/><path d="M36 66h28" fill="none" stroke-width="2"/>';
  };
  ANIMALS.hedgehog = function (c) {
    return '<path d="M14 64L8 44L22 40L18 24L34 28L36 12L50 22L64 12L66 28L82 24L78 40L92 44L86 64z" fill="#8A5A33"/>' +
      '<ellipse cx="50" cy="64" rx="26" ry="23" fill="' + c + '"/>' + eyes(58, 10) +
      '<circle cx="50" cy="70" r="4.5" fill="' + INK + '"/><path d="M45 77q5 3 10 0" fill="none"/>' +
      '<ellipse cx="34" cy="70" rx="4" ry="2.6" fill="#FF7EB6" opacity=".55" stroke="none"/><ellipse cx="66" cy="70" rx="4" ry="2.6" fill="#FF7EB6" opacity=".55" stroke="none"/>';
  };
  ANIMALS.giraffe = function (c) {
    return '<path d="M40 30V12M60 30V12" fill="none"/><circle cx="40" cy="10" r="5" fill="#A0643C"/><circle cx="60" cy="10" r="5" fill="#A0643C"/>' +
      '<ellipse cx="18" cy="46" rx="11" ry="6" transform="rotate(-25 18 46)" fill="' + c + '"/><ellipse cx="82" cy="46" rx="11" ry="6" transform="rotate(25 82 46)" fill="' + c + '"/>' +
      head(c) + '<circle cx="33" cy="38" r="5" fill="#C98B4F" stroke="none"/><circle cx="66" cy="36" r="4" fill="#C98B4F" stroke="none"/><circle cx="73" cy="60" r="4" fill="#C98B4F" stroke="none"/>' +
      eyes(50, 11) + '<ellipse cx="50" cy="70" rx="16" ry="11" fill="#FFE8B8"/>' +
      '<circle cx="45" cy="68" r="2" fill="' + INK + '" stroke="none"/><circle cx="55" cy="68" r="2" fill="' + INK + '" stroke="none"/><path d="M44 76q6 3 12 0" fill="none"/>';
  };
  ANIMALS.dragon = function (c) {
    return '<path d="M32 34q-10-14-6-26q6 10 14 18z" fill="#FFF3D6"/><path d="M68 34q10-14 6-26q-6 10-14 18z" fill="#FFF3D6"/>' +
      '<path d="M14 52l-8-14l18 4z" fill="' + c + '"/><path d="M86 52l8-14l-18 4z" fill="' + c + '"/>' +
      '<path d="M44 28l6-10l6 10z" fill="#FFB627"/>' + head(c) + eyes(48, 11) + cheeks +
      '<ellipse cx="50" cy="68" rx="18" ry="12" fill="#A8EDBE"/><circle cx="44" cy="66" r="2.2" fill="' + INK + '" stroke="none"/><circle cx="56" cy="66" r="2.2" fill="' + INK + '" stroke="none"/>' +
      '<path d="M42 74q8 5 16 0" fill="none"/>';
  };
  ANIMALS.unicorn = function (c) {
    return '<circle cx="26" cy="34" r="9" fill="#FF8FC7"/><circle cx="20" cy="50" r="9" fill="#C77DFF"/><circle cx="22" cy="66" r="9" fill="#4CC9F0"/><circle cx="38" cy="26" r="9" fill="#FFE14D"/>' +
      '<path d="M64 36l8-18l6 20z" fill="' + c + '"/>' + head(c) +
      '<path d="M45 30L52 4L59 30z" fill="#FFD23F"/><path d="M48 22h8M50 14h5" fill="none" stroke="#FF8FC7" stroke-width="2.5"/>' +
      eyes(54) + '<path d="M35 51l-4-3M65 51l4-3" fill="none" stroke-width="2"/>' + cheeks + '<path d="M44 68q6 5 12 0" fill="none"/>';
  };

  // Boardwalk animals.
  ANIMALS.seal = function (c) {
    return head(c) + eyes(50, 11) + cheeks +
      '<circle cx="43" cy="65" r="8" fill="#F1F4FA"/><circle cx="57" cy="65" r="8" fill="#F1F4FA"/>' +
      '<ellipse cx="50" cy="59" rx="5.5" ry="4" fill="' + INK + '"/>' +
      '<circle cx="40" cy="65" r="1.2" fill="' + INK + '" stroke="none"/><circle cx="45" cy="68" r="1.2" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="60" cy="65" r="1.2" fill="' + INK + '" stroke="none"/><circle cx="55" cy="68" r="1.2" fill="' + INK + '" stroke="none"/>' +
      '<path d="M30 64l-12 2M30 69l-11 5M70 64l12 2M70 69l11 5" fill="none" stroke-width="2"/>';
  };
  ANIMALS.octopus = function (c) {
    return '<path d="M22 70q-6 18 6 22q4-10 10-6q4 12 12 6q8 6 12-6q6-4 10 6q12-4 6-22z" fill="' + c + '"/>' +
      head(c) + '<circle cx="36" cy="38" r="5" fill="#FFFFFF" fill-opacity=".45" stroke="none"/><circle cx="62" cy="34" r="3.5" fill="#FFFFFF" fill-opacity=".45" stroke="none"/>' +
      eyes(54) + cheeks + '<path d="M44 66q6 6 12 0" fill="none"/>';
  };
  ANIMALS.turtle = function (c) {
    return '<path d="M6 100q2-30 44-30t44 30z" fill="#C98B4F"/><path d="M28 78l6 10h32l6-10M34 88l-6 12M66 88l6 12" fill="none" stroke-width="2.5"/>' +
      head(c) + eyes(52) + cheeks + '<circle cx="46" cy="61" r="1.5" fill="' + INK + '" stroke="none"/><circle cx="54" cy="61" r="1.5" fill="' + INK + '" stroke="none"/>' +
      '<path d="M40 66q10 8 20 0" fill="none"/>';
  };
  ANIMALS.crab = function (c) {
    return '<path d="M18 58q-14-6-12-22q2-10 10-12l2 10l8-4q4 14-8 28z" fill="' + c + '"/><path d="M82 58q14-6 12-22q-2-10-10-12l-2 10l-8-4q-4 14 8 28z" fill="' + c + '"/>' +
      '<path d="M22 74l-10 8M24 82l-8 10M78 74l10 8M76 82l8 10" fill="none" stroke-width="4"/>' +
      '<ellipse cx="50" cy="60" rx="32" ry="26" fill="' + c + '"/>' + eyes(54, 11) + cheeks + '<path d="M42 68q8 7 16 0" fill="none"/>';
  };

  // Accessories drawn over a face, sized for the standard round head.
  const ACCESSORIES = {
    bowtie: '<path d="M50 88l-14-8v16zM50 88l14-8v16z" fill="#FF5A5F"/><circle cx="50" cy="88" r="4" fill="#FF5A5F"/>',
    chef: '<circle cx="38" cy="18" r="10" fill="#FFFFFF"/><circle cx="62" cy="18" r="10" fill="#FFFFFF"/><circle cx="50" cy="12" r="12" fill="#FFFFFF"/>' +
      '<rect x="34" y="20" width="32" height="12" rx="2" fill="#FFFFFF"/>',
    tiara: '<path d="M34 32l4-12l6 8l6-12l6 12l6-8l4 12z" fill="#FFD23F"/><circle cx="50" cy="23" r="2.5" fill="#FF5FA2"/>',
    bow: '<path d="M66 30l-10-8v16zM66 30l10-8v16z" fill="#FF5FA2"/><circle cx="66" cy="30" r="4" fill="#FF5FA2"/>',
    flower: '<circle cx="70" cy="28" r="9" fill="#FF8FC7"/><circle cx="70" cy="28" r="4" fill="#FFE14D"/>',
    glasses: '<circle cx="40" cy="52" r="8" fill="#FFFFFF" fill-opacity=".3"/><circle cx="60" cy="52" r="8" fill="#FFFFFF" fill-opacity=".3"/><path d="M48 52h4M32 51l-8-2M68 51l8-2" fill="none"/>',
    shades: '<rect x="28" y="45" width="19" height="11" rx="4" fill="#2B2147"/><rect x="53" y="45" width="19" height="11" rx="4" fill="#2B2147"/>' +
      '<path d="M47 49h6" fill="none"/><path d="M31 48l4 0M56 48l4 0" fill="none" stroke="#FFFFFF" stroke-width="2"/>',
    headphones: '<path d="M20 58a30 30 0 0 1 60 0" fill="none" stroke-width="6"/><rect x="12" y="50" width="12" height="18" rx="5" fill="#FF5FA2"/><rect x="76" y="50" width="12" height="18" rx="5" fill="#FF5FA2"/>',
    wizard: '<path d="M28 32L50 0L72 32z" fill="#5B4BB7"/><path d="M22 34q28-10 56 0q-28 6-56 0z" fill="#5B4BB7"/>' + sparkle(52, 18, 5, '#FFE14D'),
    pirate: '<path d="M20 34q30-32 60 0q-30-6-60 0z" fill="#2B2147"/><circle cx="50" cy="22" r="4" fill="#FFFFFF" stroke="none"/>',
    cap: '<path d="M24 38a26 22 0 0 1 52 0z" fill="#4CC9F0"/><path d="M18 38h64" fill="none" stroke-width="5"/><circle cx="50" cy="16" r="3" fill="#FFFFFF"/>',
    beanie: '<path d="M24 40a26 26 0 0 1 52 0z" fill="#FF5FA2"/><rect x="22" y="35" width="56" height="9" rx="4" fill="#FF8FC7"/><circle cx="50" cy="12" r="6" fill="#FFFFFF"/>',
    crown: '<path d="M30 34l-2-20l11 10l11-14l11 14l11-10l-2 20z" fill="#FFD23F"/><circle cx="50" cy="26" r="3" fill="#FF5FA2"/>',
    party: '<path d="M38 34L50 2L62 34z" fill="#8C6CFF"/><path d="M45 17h10M41 27h18" fill="none" stroke="#FFE14D" stroke-width="3"/><circle cx="50" cy="3" r="4" fill="#FF5FA2"/>',
    sailor: '<path d="M32 32q0-18 18-18t18 18z" fill="#FFFFFF"/><path d="M22 36q2-10 8-8q20 6 40 0q6-2 8 8q-28 8-56 0z" fill="#FFFFFF"/>' +
      '<path d="M30 33q20 5 40 0" fill="none" stroke="#4C5FA8" stroke-width="3"/>',
    tophat: '<rect x="34" y="2" width="32" height="30" rx="2" fill="#3E3A55"/><rect x="34" y="20" width="32" height="7" fill="#FF5FA2" stroke="none"/>' +
      '<rect x="34" y="2" width="32" height="30" rx="2" fill="none"/><rect x="20" y="29" width="60" height="7" rx="3.5" fill="#3E3A55"/>',
    halo: '<ellipse cx="50" cy="14" rx="22" ry="7" fill="none" stroke-width="11"/><ellipse cx="50" cy="14" rx="22" ry="7" fill="none" stroke="#FFD23F" stroke-width="5"/>',
    santa: '<path d="M30 34L58 2L72 34z" fill="#FF5A5F"/><circle cx="58" cy="4" r="6" fill="#FFFFFF"/><rect x="24" y="28" width="52" height="11" rx="5.5" fill="#FFFFFF"/>',
  };

  // Accessories worn on top of the head. A Manager Hats look replaces these and keeps the rest (glasses, bow ties...).
  const HEADWEAR = ['chef', 'tiara', 'bow', 'flower', 'wizard', 'pirate', 'cap', 'beanie', 'crown', 'party', 'sailor', 'tophat', 'halo', 'santa'];

  function face(animal, color, acc, hat) {
    const own = hat && HEADWEAR.indexOf(acc) >= 0 ? '' : ACCESSORIES[acc] || '';
    return svg((ANIMALS[animal] || ANIMALS.cat)(color) + own + (ACCESSORIES[hat] || ''), '');
  }

  // ---------------------------------------------------------------------------
  // What each shop's customers carry away. Drawn small, so the outlines are thick.
  // ---------------------------------------------------------------------------
  const PRODUCTS = {
    lemon: '<path d="M56 30l14-24" fill="none" stroke="#FF5FA2" stroke-width="8"/>' +
      '<path d="M24 30h52l-8 62h-36z" fill="#FFE14D"/><path d="M27 44h46" fill="none" stroke="#FFF7B8" stroke-width="6"/>' +
      '<circle cx="26" cy="30" r="13" fill="#FFF07A"/>',
    icecream: '<path d="M28 46l22 50l22-50z" fill="#F4A259"/><circle cx="50" cy="36" r="22" fill="#FF8FC7"/><circle cx="50" cy="12" r="8" fill="#FF3B6B"/>',
    donut: '<path d="' + ring(50, 52, 42, 13) + '" fill="#E8A25B" fill-rule="evenodd"/>' +
      '<path d="' + ring(50, 50, 34, 13) + '" fill="#FF7EB6" fill-rule="evenodd" stroke="none"/>' +
      '<path d="M30 34l6 4M64 28l-4 6M70 52l6 2M26 56l6-2" fill="none" stroke="#FFFFFF" stroke-width="6"/>',
    pizza: '<path d="M16 24q34-14 68 0l-34 70z" fill="#FFD23F"/><path d="M12 18q38-16 76 0l-4 12q-34-14-68 0z" fill="#E89B4A"/>' +
      '<circle cx="40" cy="42" r="8" fill="#FF5A5F"/><circle cx="60" cy="44" r="7" fill="#FF5A5F"/><circle cx="50" cy="64" r="6" fill="#FF5A5F"/>',
    toys: '<circle cx="26" cy="28" r="14" fill="#C68A5B"/><circle cx="74" cy="28" r="14" fill="#C68A5B"/>' +
      '<circle cx="50" cy="56" r="36" fill="#C68A5B"/><ellipse cx="50" cy="68" rx="16" ry="12" fill="#F3C9A0"/>' +
      '<circle cx="38" cy="50" r="5" fill="' + INK + '" stroke="none"/><circle cx="62" cy="50" r="5" fill="' + INK + '" stroke="none"/><ellipse cx="50" cy="63" rx="6" ry="4" fill="' + INK + '"/>',
    candy: '<path d="M50 96V58" fill="none" stroke-width="9"/><circle cx="50" cy="36" r="30" fill="#FFE14D"/>' +
      '<path d="M50 36m-2 0a4 4 0 1 1 6 2a11 11 0 1 1 -16 -8a18 18 0 1 1 26 14" fill="none" stroke="#FF5FA2" stroke-width="7"/>',
    park: '<path d="M50 70q-8 12 2 28" fill="none"/><path d="M50 4c20 0 32 15 32 34c0 20-16 34-32 34s-32-14-32-34c0-19 12-34 32-34z" fill="#FF5A5F"/>' +
      '<path d="M34 26q4-10 14-12" fill="none" stroke="#FFFFFF" stroke-width="7"/>',
    studio: '<circle cx="34" cy="26" r="12" fill="#FFF7D6"/><circle cx="52" cy="20" r="13" fill="#FFF7D6"/><circle cx="68" cy="28" r="12" fill="#FFF7D6"/>' +
      '<path d="M22 36h56l-8 58h-40z" fill="#FFFFFF"/><path d="M38 36l3 58M58 36l-3 58" fill="none" stroke="#FF5A5F" stroke-width="10"/><path d="M22 36h56l-8 58h-40z" fill="none"/>',
    rocket: '<path d="M14 46q0-32 36-32t36 32z" fill="#F6B04E"/><path d="M12 54q10-8 19 0q10-8 19 0q10-8 19 0q10-8 19 0" fill="none" stroke="#3DDC97" stroke-width="9"/>' +
      '<rect x="12" y="58" width="76" height="14" rx="6" fill="#8B4A2B"/><path d="M14 76h72q0 16-14 16h-44q-14 0-14-16z" fill="#F6B04E"/>',
    moon: '<path d="M34 34q0-24 16-24t16 24" fill="none" stroke-width="8"/><path d="M18 32h64l6 60h-76z" fill="#C77DFF"/>' +
      sparkle(50, 62, 16, '#FFE14D').replace('stroke-width="2"', 'stroke-width="6"'),
    crayon: '<g transform="rotate(35 50 50)"><rect x="37" y="30" width="26" height="62" rx="4" fill="#4CC9F0"/><path d="M37 30l13-24l13 24z" fill="#4CC9F0"/>' +
      '<path d="M42 48h16M42 74h16" fill="none" stroke="#FFFFFF" stroke-width="7"/></g>',
    sneaker: '<path d="M8 66V40q0-8 8-8h18l12 14q26 0 42 12q6 8 0 8z" fill="#FF5A5F"/><path d="M6 66h84q0 14-12 14h-60q-12 0-12-14z" fill="#FFFFFF"/>' +
      '<path d="M30 40l10 8M38 36l10 8" fill="none" stroke="#FFFFFF" stroke-width="6"/>',
    choco: '<rect x="20" y="12" width="60" height="78" rx="6" fill="#6B3A1E"/><path d="M50 16v34M24 32h52" fill="none" stroke="#8B4A2B" stroke-width="5"/>' +
      '<path d="M20 52h60v32q0 6-6 6h-48q-6 0-6-6z" fill="#FFD23F"/>',
    robot: '<path d="M50 18V8" fill="none"/><circle cx="50" cy="7" r="5" fill="#FF5A5F"/><rect x="22" y="18" width="56" height="42" rx="10" fill="#E4ECF7"/>' +
      '<circle cx="38" cy="38" r="8" fill="#4CC9F0"/><circle cx="62" cy="38" r="8" fill="#4CC9F0"/><rect x="30" y="60" width="40" height="32" rx="6" fill="#5B8CFF"/>',
    rainbow: '<path d="M14 72a36 36 0 0 1 72 0" fill="none" stroke-width="30" stroke-linecap="butt"/>' +
      '<path d="M6 72a44 44 0 0 1 88 0" fill="none" stroke="#FF5A5F" stroke-width="8" stroke-linecap="butt"/>' +
      '<path d="M14 72a36 36 0 0 1 72 0" fill="none" stroke="#FFE14D" stroke-width="8" stroke-linecap="butt"/>' +
      '<path d="M22 72a28 28 0 0 1 56 0" fill="none" stroke="#4CC9F0" stroke-width="8" stroke-linecap="butt"/>' +
      '<circle cx="14" cy="78" r="12" fill="#FFFFFF"/><circle cx="86" cy="78" r="12" fill="#FFFFFF"/>',
    star: '<path d="' + star5(50, 54, 46, 21) + '" fill="#FFE14D"/>' +
      '<circle cx="41" cy="52" r="4" fill="' + INK + '" stroke="none"/><circle cx="59" cy="52" r="4" fill="' + INK + '" stroke="none"/><path d="M43 63q7 6 14 0" fill="none" stroke-width="5"/>',
    // Sprinkle Street
    cupcake: '<path d="M24 54h52l-8 38h-36z" fill="#8C6CFF"/><path d="M38 57l2 33M50 57v33M62 57l-2 33" fill="none" stroke="#B9A4FF" stroke-width="5"/>' +
      '<path d="M24 54h52l-8 38h-36z" fill="none"/><path d="M16 56q0-16 14-18q0-18 20-18t20 18q14 2 14 18z" fill="#FF8FC7"/>' +
      '<circle cx="50" cy="13" r="8" fill="#FF3B6B"/><path d="M31 46l4-3M50 34l4 2M65 46l-3-4" fill="none" stroke="#FFFFFF" stroke-width="5"/>',
    bubbletea: '<path d="M58 30l12-26" fill="none" stroke="#FF5FA2" stroke-width="10"/><path d="M22 36h56l-8 56h-40z" fill="#F3D3B0"/>' +
      '<path d="M18 36q32-26 64 0z" fill="#FFFFFF"/>' +
      '<circle cx="38" cy="80" r="5" fill="' + INK + '" stroke="none"/><circle cx="52" cy="84" r="5" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="62" cy="74" r="5" fill="' + INK + '" stroke="none"/><circle cx="45" cy="68" r="5" fill="' + INK + '" stroke="none"/>',
    cottoncandy: '<path d="M50 96V62" fill="none" stroke-width="9"/><circle cx="34" cy="44" r="18" fill="#FF8FC7"/><circle cx="64" cy="40" r="20" fill="#C9B6FF"/>' +
      '<circle cx="50" cy="22" r="16" fill="#FFB3D9"/><circle cx="50" cy="56" r="14" fill="#FF8FC7"/>',
    popsicle: '<rect x="43" y="66" width="14" height="30" rx="7" fill="#E8B97A"/><path d="M24 28q0-22 26-22t26 22v46h-52z" fill="#4CC9F0"/>' +
      '<path d="M26 46h48" fill="none" stroke="#FFFFFF" stroke-width="7"/><path d="M24 28q0-22 26-22t26 22v46h-52z" fill="none"/>',
    pancake: '<ellipse cx="50" cy="86" rx="44" ry="9" fill="#FFFFFF"/><ellipse cx="50" cy="74" rx="36" ry="11" fill="#E8A25B"/>' +
      '<ellipse cx="50" cy="60" rx="36" ry="11" fill="#E8A25B"/><ellipse cx="50" cy="46" rx="36" ry="11" fill="#F6B04E"/>' +
      '<path d="M24 46q6 14 10 2q4 16 10 2q6 12 12 0q4 10 10-4" fill="#8B4A2B"/><rect x="42" y="30" width="16" height="12" rx="3" fill="#FFE14D"/>',
    taco: '<path d="M10 48q4-14 12-6q6-14 14-6q6-14 14-6q6-14 14-6q6-14 14-6q6-12 12 4z" fill="#3DDC97"/>' +
      '<circle cx="34" cy="40" r="6" fill="#FF5A5F"/><circle cx="62" cy="38" r="6" fill="#FF5A5F"/>' +
      '<path d="M8 46a42 42 0 0 0 84 0z" fill="#FFD23F"/><path d="M24 56q26 22 52 0" fill="none" stroke="#F6B04E" stroke-width="5"/>',
    sushi: '<circle cx="50" cy="50" r="42" fill="' + INK + '"/><circle cx="50" cy="50" r="31" fill="#FFFFFF" stroke="none"/>' +
      '<circle cx="50" cy="50" r="14" fill="#FF8A65"/><circle cx="64" cy="36" r="5" fill="#3DDC97"/>',
    cookie: '<circle cx="50" cy="50" r="42" fill="#E8A25B"/><ellipse cx="34" cy="34" rx="6" ry="5" fill="#6B3A1E" stroke="none"/>' +
      '<ellipse cx="60" cy="30" rx="6" ry="5" fill="#6B3A1E" stroke="none"/><ellipse cx="68" cy="58" rx="6" ry="5" fill="#6B3A1E" stroke="none"/>' +
      '<ellipse cx="40" cy="64" rx="6" ry="5" fill="#6B3A1E" stroke="none"/><ellipse cx="52" cy="48" rx="5" ry="4" fill="#6B3A1E" stroke="none"/>',
    waffle: '<rect x="12" y="12" width="76" height="76" rx="16" fill="#F6B04E"/>' +
      '<path d="M31 16v68M50 14v72M69 16v68M16 31h68M14 50h72M16 69h68" fill="none" stroke="#C98B4F" stroke-width="5"/>' +
      '<rect x="12" y="12" width="76" height="76" rx="16" fill="none"/><rect x="40" y="40" width="20" height="16" rx="3" fill="#FFE14D"/>',
    pets: '<ellipse cx="50" cy="66" rx="24" ry="20" fill="#C68A5B"/><circle cx="22" cy="42" r="10" fill="#C68A5B"/>' +
      '<circle cx="38" cy="24" r="10" fill="#C68A5B"/><circle cx="62" cy="24" r="10" fill="#C68A5B"/><circle cx="78" cy="42" r="10" fill="#C68A5B"/>',
    flowers: '<path d="M30 54l20 42l20-42z" fill="#3DDC97"/><circle cx="30" cy="42" r="18" fill="#FF5FA2"/><circle cx="70" cy="42" r="18" fill="#C77DFF"/>' +
      '<circle cx="50" cy="22" r="18" fill="#FF9F43"/><circle cx="30" cy="42" r="6" fill="#FFE14D" stroke="none"/><circle cx="70" cy="42" r="6" fill="#FFE14D" stroke="none"/><circle cx="50" cy="22" r="6" fill="#FFE14D" stroke="none"/>',
    comics: '<rect x="16" y="8" width="68" height="84" rx="4" fill="#FFFFFF"/><rect x="16" y="8" width="68" height="18" fill="#FF5A5F"/>' +
      '<path d="' + star5(50, 60, 26, 12) + '" fill="#FFE14D"/><rect x="16" y="8" width="68" height="84" rx="4" fill="none"/>',
    arcade: '<path d="M24 34h52q16 0 18 22t-12 24q-8 0-14-12h-36q-6 12-14 12t-12-24t18-22z" fill="#8C6CFF"/>' +
      '<path d="M30 52h14M37 45v14" fill="none" stroke="#FFFFFF" stroke-width="7"/><circle cx="64" cy="48" r="5" fill="#FF5A5F"/><circle cx="74" cy="58" r="5" fill="#3DDC97"/>',
    music: '<path d="M36 76V24l44-12v52" fill="none" stroke-width="10"/><ellipse cx="26" cy="78" rx="14" ry="10" fill="#FF5FA2"/><ellipse cx="70" cy="66" rx="14" ry="10" fill="#FF5FA2"/>',
    skate: '<rect x="6" y="38" width="88" height="18" rx="9" fill="#FF9F43"/><path d="M22 47h56" fill="none" stroke="#FFE14D" stroke-width="6"/>' +
      '<rect x="6" y="38" width="88" height="18" rx="9" fill="none"/><circle cx="26" cy="68" r="9" fill="#4CC9F0"/><circle cx="74" cy="68" r="9" fill="#4CC9F0"/>',
    magic: '<path d="M18 90L60 48" fill="none" stroke-width="14"/><path d="M18 90L60 48" fill="none" stroke="#FFFFFF" stroke-width="5"/>' +
      '<path d="' + star5(66, 32, 26, 11) + '" fill="#FFE14D"/>',
    dino: '<path d="M24 64L4 76l22-2z" fill="#3DDC97"/><rect x="30" y="66" width="10" height="20" rx="4" fill="#3DDC97"/><rect x="58" y="66" width="10" height="20" rx="4" fill="#3DDC97"/>' +
      '<path d="M34 48l6-16l8 12l8-16l8 16" fill="#FFB627"/><ellipse cx="50" cy="60" rx="30" ry="18" fill="#3DDC97"/>' +
      '<circle cx="82" cy="44" r="12" fill="#3DDC97"/><circle cx="85" cy="41" r="3" fill="' + INK + '" stroke="none"/>',
    pirate: '<path d="M14 46q0-26 36-26t36 26z" fill="#A0643C"/><rect x="14" y="46" width="72" height="40" rx="4" fill="#C98B4F"/>' +
      '<path d="M30 23v62M70 23v62" fill="none" stroke="#FFD23F" stroke-width="6"/><rect x="42" y="40" width="16" height="16" rx="3" fill="#FFD23F"/>',
    dragon: '<path d="M50 6c22 0 36 32 36 54c0 18-16 32-36 32s-36-14-36-32c0-22 14-54 36-54z" fill="#5ED38A"/>' +
      '<circle cx="38" cy="40" r="6" fill="#FFD23F" stroke="none"/><circle cx="62" cy="56" r="8" fill="#FFD23F" stroke="none"/><circle cx="42" cy="74" r="5" fill="#FFD23F" stroke="none"/>' +
      '<path d="M22 52l10 6l8-8l10 8l8-6l10 6l8-4" fill="none" stroke-width="5"/>',
    unicorn: '<path d="M50 4L72 90H28z" fill="#FFD23F"/><path d="M36 70l28-12M40 50l20-9M45 30l10-5" fill="none" stroke="#FF8FC7" stroke-width="7"/>' +
      '<path d="M50 4L72 90H28z" fill="none"/>',
    // Boardwalk
    shaveice: '<path d="M24 52l26 42l26-42z" fill="#FFFFFF"/><path d="M36 60l14 24" fill="none" stroke="#4CC9F0" stroke-width="5"/>' +
      '<circle cx="33" cy="44" r="15" fill="#FF5FA2"/><circle cx="67" cy="44" r="15" fill="#4CC9F0"/><circle cx="50" cy="30" r="18" fill="#FFE14D"/>',
    hotdog: '<rect x="6" y="34" width="88" height="26" rx="13" fill="#FF6B6B"/>' +
      '<path d="M22 44q5-6 10 0t10 0t10 0t10 0t10 0" fill="none" stroke="#FFE14D" stroke-width="5"/>' +
      '<path d="M12 54q0 26 22 26h32q22 0 22-26z" fill="#F6B04E"/>',
    pretzel: '<path d="M30 76C4 66 10 22 34 22C46 22 50 36 50 48C50 36 54 22 66 22C90 22 96 66 70 76M30 78L68 40M70 78L32 40" fill="none" stroke-width="22"/>' +
      '<path d="M30 76C4 66 10 22 34 22C46 22 50 36 50 48C50 36 54 22 66 22C90 22 96 66 70 76M30 78L68 40M70 78L32 40" fill="none" stroke="#C98B4F" stroke-width="10"/>' +
      '<circle cx="22" cy="40" r="2.5" fill="#FFFFFF" stroke="none"/><circle cx="78" cy="40" r="2.5" fill="#FFFFFF" stroke="none"/><circle cx="50" cy="60" r="2.5" fill="#FFFFFF" stroke="none"/>',
    surf: '<g transform="rotate(30 50 50)"><path d="M50 2q22 30 15 76q-4 16-15 18q-11-2-15-18q-7-46 15-76z" fill="#2ED3A0"/>' +
      '<path d="M50 12v78" fill="none" stroke="#FFFFFF" stroke-width="6"/><path d="M50 2q22 30 15 76q-4 16-15 18q-11-2-15-18q-7-46 15-76z" fill="none"/></g>',
    taffy: '<path d="M6 30l26 12v16l-26 12z" fill="#FF8FC7"/><path d="M94 30l-26 12v16l26 12z" fill="#FF8FC7"/>' +
      '<ellipse cx="50" cy="50" rx="24" ry="19" fill="#FFFFFF"/><path d="M36 36l12 28M52 32l12 28" fill="none" stroke="#FF5FA2" stroke-width="6"/>' +
      '<ellipse cx="50" cy="50" rx="24" ry="19" fill="none"/>',
    fishchips: '<rect x="28" y="14" width="9" height="34" rx="2" fill="#FFD23F"/><rect x="40" y="8" width="9" height="40" rx="2" fill="#FFD23F"/>' +
      '<ellipse cx="66" cy="32" rx="16" ry="10" fill="#F6B04E" transform="rotate(-25 66 32)"/>' +
      '<path d="M20 42l30 52l30-52z" fill="#FFFFFF"/><path d="M27 54h46M34 66h32" fill="none" stroke="#5B8CFF" stroke-width="5"/><path d="M20 42l30 52l30-52z" fill="none"/>',
    ferris: '<g transform="rotate(-15 50 50)"><path d="M8 28h84v14a8 8 0 0 0 0 16v14h-84v-14a8 8 0 0 0 0-16z" fill="#FF5FA2"/>' +
      '<path d="M30 34v32" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="5 6"/><path d="' + star5(62, 50, 15, 6.5) + '" fill="#FFE14D" stroke-width="4"/></g>',
    carousel: '<path d="M50 50v46" fill="none" stroke-width="8"/>' +
      ['#FF5FA2', '#4CC9F0', '#FFE14D', '#3DDC97'].map(function (c, k) {
        return '<path d="M50 50V10a20 20 0 0 1 20 20z" fill="' + c + '" transform="rotate(' + k * 90 + ' 50 50)"/>';
      }).join('') + '<circle cx="50" cy="50" r="6" fill="#FFFFFF"/>',
    aquarium: '<path d="M38 24h24q24 30 16 56q-6 14-28 14t-28-14q-8-26 16-56z" fill="#BDEBFF"/>' +
      '<ellipse cx="46" cy="66" rx="14" ry="10" fill="#FF9F43"/><path d="M58 66l14-9v18z" fill="#FF9F43"/><circle cx="40" cy="63" r="2.5" fill="' + INK + '" stroke="none"/>' +
      '<path d="M40 14l10 10l10-10" fill="none" stroke="#FF5FA2" stroke-width="6"/>',
    lighthouse: '<path d="M36 22q-6-8 0-16M52 22q-6-8 0-16" fill="none" stroke-width="5"/>' +
      '<rect x="14" y="32" width="54" height="58" rx="8" fill="#FF5A5F"/><path d="M68 46q18 0 18 14t-18 14" fill="none" stroke-width="9"/>' +
      '<path d="M16 62h50" fill="none" stroke="#FFFFFF" stroke-width="6"/><rect x="14" y="32" width="54" height="58" rx="8" fill="none"/>' +
      '<rect x="22" y="22" width="16" height="14" rx="3" fill="#FFFFFF"/><rect x="42" y="24" width="16" height="12" rx="3" fill="#FFFFFF"/>',
    kites: '<path d="M50 78q-12 6-2 12t-6 10" fill="none" stroke-width="4"/><path d="M42 86l8-4l-2 9z" fill="#FF5FA2" stroke-width="3"/>' +
      '<path d="M50 4L82 40L50 78L18 40z" fill="#5B8CFF"/><path d="M50 4L82 40L50 40z" fill="#FFE14D" stroke="none"/><path d="M50 40L18 40L50 78z" fill="#FFE14D" stroke="none"/>' +
      '<path d="M50 4L82 40L50 78L18 40zM50 4V78M18 40H82" fill="none"/>',
    sandcastle: '<path d="M24 34q2-14 14-10q8-14 22-6q14-6 16 16z" fill="#F6D7A7"/><path d="M24 36q26-36 52 0" fill="none" stroke-width="5"/>' +
      '<path d="M20 34h60l-8 56h-44z" fill="#FF5FA2"/><path d="M23 50h54" fill="none" stroke="#FFFFFF" stroke-width="6"/><path d="M20 34h60l-8 56h-44z" fill="none"/>',
    duckboats: '<ellipse cx="54" cy="66" rx="38" ry="24" fill="#FFD23F"/><circle cx="36" cy="36" r="20" fill="#FFD23F"/>' +
      '<path d="M18 36q-16 2-14 9q8 5 18 0z" fill="#FF9F43"/><circle cx="34" cy="31" r="3.5" fill="' + INK + '" stroke="none"/>' +
      '<path d="M50 62q16-10 30 4q-14 12-30-4z" fill="#FFE97A"/>',
    circus: '<circle cx="30" cy="34" r="11" fill="#FFF7D6"/><circle cx="70" cy="34" r="11" fill="#FFF7D6"/><circle cx="50" cy="24" r="13" fill="#FFF0A6"/>' +
      '<circle cx="40" cy="38" r="10" fill="#FFF0A6"/><circle cx="60" cy="38" r="10" fill="#FFF7D6"/>' +
      '<path d="M20 42h60l-8 50h-44z" fill="#FFFFFF"/><path d="M33 42l3 50h11v-50zM55 42v50h11l3-50z" fill="#FF5A5F" stroke="none"/><path d="M20 42h60l-8 50h-44z" fill="none"/>',
    fireworks: '<path d="M50 76v20" fill="none" stroke-width="5"/><path d="M38 62l-12 18h12zM62 62l12 18h-12z" fill="#4CC9F0"/>' +
      '<rect x="38" y="30" width="24" height="48" rx="4" fill="#FF5FA2"/><path d="M40 50h20" fill="none" stroke="#FFFFFF" stroke-width="6"/>' +
      '<rect x="38" y="30" width="24" height="48" rx="4" fill="none"/><path d="M36 32L50 4L64 32z" fill="#FFE14D"/>',
    funhouse: '<path d="M20 90V44q0-32 30-32t30 32v46l-10-8l-10 8l-10-8l-10 8l-10-8z" fill="#FFFFFF"/>' +
      '<ellipse cx="40" cy="46" rx="5" ry="7" fill="' + INK + '" stroke="none"/><ellipse cx="60" cy="46" rx="5" ry="7" fill="' + INK + '" stroke="none"/>' +
      '<ellipse cx="50" cy="64" rx="6" ry="7" fill="' + INK + '" stroke="none"/><ellipse cx="32" cy="58" rx="5" ry="3" fill="#FF8FC7" stroke="none"/><ellipse cx="68" cy="58" rx="5" ry="3" fill="#FF8FC7" stroke="none"/>',
    bumper: '<path d="M74 44V8" fill="none" stroke-width="5"/>' + sparkle(74, 10, 10, '#FFE14D').replace('stroke-width="2"', 'stroke-width="4"') +
      '<rect x="50" y="22" width="18" height="26" rx="5" fill="#4CC9F0"/><rect x="10" y="40" width="80" height="32" rx="14" fill="#FF9F43"/>' +
      '<rect x="4" y="64" width="92" height="16" rx="8" fill="' + INK + '"/><path d="M20 52h22" fill="none" stroke="#FFFFFF" stroke-width="6"/>',
    pearl: '<path d="M16 38q34-50 68 0q-34-8-68 0z" fill="#FFB3D9"/><path d="M50 32L36 12M50 32V6M50 32L64 12" fill="none" stroke="#FFFFFF" stroke-width="4"/>' +
      '<path d="M16 38q34-50 68 0q-34-8-68 0z" fill="none"/>' +
      '<path d="M8 66q42-12 84 0q-42 40-84 0z" fill="#FF8FC7"/><path d="M30 74l4 8M50 72v12M70 74l-4 8" fill="none" stroke="#FFFFFF" stroke-width="4"/>' +
      '<circle cx="50" cy="56" r="15" fill="#FFFFFF"/><path d="M42 51q3-5 9-6" fill="none" stroke="#DCD6EA" stroke-width="4"/>',
    jellybean: '<rect x="26" y="10" width="48" height="14" rx="4" fill="#3DDC97"/><rect x="18" y="24" width="64" height="68" rx="14" fill="#E8FAFF"/>' +
      [[34, 46, 20, '#FF5FA2'], [56, 42, -30, '#FFE14D'], [44, 62, 60, '#8C6CFF'], [66, 62, 10, '#FF9F43'], [34, 78, -20, '#4CC9F0'], [56, 80, 40, '#3DDC97']].map(function (b) {
        return '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="9" ry="6" transform="rotate(' + b[2] + ' ' + b[0] + ' ' + b[1] + ')" fill="' + b[3] + '" stroke-width="3"/>';
      }).join('') + '<rect x="18" y="24" width="64" height="68" rx="14" fill="none"/>',
    planetarium: '<ellipse cx="50" cy="52" rx="44" ry="12" transform="rotate(-15 50 52)" fill="none" stroke-width="14"/>' +
      '<ellipse cx="50" cy="52" rx="44" ry="12" transform="rotate(-15 50 52)" fill="none" stroke="#FFE14D" stroke-width="6"/>' +
      '<circle cx="50" cy="50" r="26" fill="#8C6CFF"/><path d="M34 40q8-10 20-10" fill="none" stroke="#B9A4FF" stroke-width="5"/>' +
      '<path d="M6 52a44 12 0 0 0 88 0" transform="rotate(-15 50 52)" fill="none" stroke-width="14"/>' +
      '<path d="M6 52a44 12 0 0 0 88 0" transform="rotate(-15 50 52)" fill="none" stroke="#FFE14D" stroke-width="6"/>',
    mermaid: '<path d="M50 92L10 42q0-30 40-34q40 4 40 34z" fill="#FF8FC7"/>' +
      '<path d="M50 88L26 16M50 88V10M50 88L74 16" fill="none" stroke="#FFFFFF" stroke-width="4"/><path d="M50 92L10 42q0-30 40-34q40 4 40 34z" fill="none"/>',
    ufo: '<circle cx="50" cy="38" r="9" fill="#9BE36D"/><path d="M50 29v-8" fill="none" stroke-width="4"/>' +
      '<path d="M28 48a22 22 0 0 1 44 0z" fill="#C9F7FF" fill-opacity=".6"/><ellipse cx="50" cy="56" rx="44" ry="14" fill="#C9C3E6"/>' +
      '<circle cx="26" cy="58" r="4" fill="#FFE14D" stroke-width="3"/><circle cx="50" cy="62" r="4" fill="#FFE14D" stroke-width="3"/><circle cx="74" cy="58" r="4" fill="#FFE14D" stroke-width="3"/>',
    balloonport: '<path d="M40 76l2 10M60 76l-2 10" fill="none" stroke-width="4"/><rect x="36" y="84" width="28" height="12" rx="2" fill="#C98B4F"/>' +
      '<path d="M50 4c24 0 36 16 36 32c0 18-20 30-26 42h-20c-6-12-26-24-26-42c0-16 12-32 36-32z" fill="#FF9F43"/>' +
      '<path d="M50 6c-12 10-14 50-6 70M50 6c12 10 14 50 6 70" fill="none" stroke="#FFE14D" stroke-width="7"/>' +
      '<path d="M50 4c24 0 36 16 36 32c0 18-20 30-26 42h-20c-6-12-26-24-26-42c0-16 12-32 36-32z" fill="none"/>',
    dreampalace: '<path d="M60 8a42 42 0 1 0 30 62a34 34 0 1 1-30-62z" fill="#FFE14D"/>' +
      sparkle(78, 22, 12, '#FFFFFF').replace('stroke-width="2"', 'stroke-width="4"') + sparkle(86, 50, 7, '#FFFFFF').replace('stroke-width="2"', 'stroke-width="3"'),
  };

  function product(id) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><g stroke="' + INK + '" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">' + (PRODUCTS[id] || '') + '</g></svg>';
  }

  // ---------------------------------------------------------------------------
  // Small icons
  // ---------------------------------------------------------------------------
  // Coin designs (a Customization). coin() draws the one in use.
  const SHINE = '<path d="M30 30a28 28 0 0 1 14-8" fill="none" stroke="#FFFFFF" stroke-width="5"/>';
  const COINS = {
    classic: '<circle cx="50" cy="50" r="40" fill="#FFC93C" stroke-width="7"/><circle cx="50" cy="50" r="27" fill="none" stroke="#E09A00" stroke-width="5"/>' +
      sparkle(50, 50, 15, '#FFF3B0').replace('stroke-width="2"', 'stroke="none"') + SHINE,
    heart: '<path d="M50 88C20 68 8 50 8 33C8 19 19 9 32 9c8 0 14 4 18 10c4-6 10-10 18-10c13 0 24 10 24 24c0 17-12 35-42 55z" fill="#FF5FA2" stroke-width="7"/>' +
      '<path d="M50 72C30 58 22 46 22 36c0-8 6-13 12-13c6 0 10 4 16 12c6-8 10-12 16-12c6 0 12 5 12 13c0 10-8 22-28 36z" fill="#FF8FC7" stroke="none"/>' +
      '<path d="M22 30q2-10 12-12" fill="none" stroke="#FFFFFF" stroke-width="5"/>',
    star: '<path d="' + star5(50, 53, 46, 22) + '" fill="#FFD23F" stroke-width="7"/><path d="' + star5(50, 53, 24, 11) + '" fill="#FFF3B0" stroke="none"/>',
    donut: '<path d="' + ring(50, 50, 42, 13) + '" fill="#E8A25B" fill-rule="evenodd" stroke-width="7"/>' +
      '<path d="' + ring(50, 48, 34, 13) + '" fill="#FF7EB6" fill-rule="evenodd" stroke="none"/>' +
      '<path d="M30 34l6 4M66 28l-4 6M70 56l6 2M28 58l6-2M48 22h6" fill="none" stroke="#FFFFFF" stroke-width="5"/>',
    gem: '<path d="M28 12h44l22 26l-44 52l-44-52z" fill="#4CC9F0" stroke-width="7"/><path d="M6 38h88M28 12l22 78l22-78M38 38l12-26l12 26" fill="none" stroke="#B5ECFF" stroke-width="3"/>' +
      '<path d="M28 12h44l22 26l-44 52l-44-52z" fill="none" stroke-width="7"/>',
    rainbow: '<circle cx="50" cy="50" r="40" fill="#FF5A5F" stroke-width="7"/><circle cx="50" cy="50" r="31" fill="#FF9F43" stroke="none"/>' +
      '<circle cx="50" cy="50" r="23" fill="#FFE14D" stroke="none"/><circle cx="50" cy="50" r="15" fill="#3DDC97" stroke="none"/><circle cx="50" cy="50" r="7" fill="#4CC9F0" stroke="none"/>' + SHINE,
  };
  let coinStyle = 'classic';
  function setCoinStyle(style) { coinStyle = COINS[style] ? style : 'classic'; }

  function coin(style) {
    return svg(COINS[style] || COINS[coinStyle], 'coins');
  }

  // A customer's head and shoulders, for previewing hat styles.
  function customer(hat) {
    const hats = {
      mixed: '<path d="M30 40a20 18 0 0 1 40 0z" fill="#4CC9F0"/><path d="M50 40h28" fill="none" stroke-width="5"/>',
      party: '<path d="M38 38L50 6L62 38z" fill="#FF5FA2"/><path d="M44 24h12" fill="none" stroke="#FFE14D" stroke-width="3"/><circle cx="50" cy="6" r="5" fill="#FFE14D"/>',
      ears: '<ellipse cx="40" cy="20" rx="7" ry="18" fill="#FFFFFF"/><ellipse cx="60" cy="20" rx="7" ry="18" fill="#FFFFFF"/>' +
        '<ellipse cx="40" cy="22" rx="3" ry="12" fill="#FFB3C8" stroke="none"/><ellipse cx="60" cy="22" rx="3" ry="12" fill="#FFB3C8" stroke="none"/>',
      tophat: '<rect x="36" y="8" width="28" height="28" rx="2" fill="#3E3A55"/><path d="M36 28h28" fill="none" stroke="#FF5FA2" stroke-width="5"/><path d="M26 38h48" fill="none" stroke-width="5"/>',
      halo: '<ellipse cx="50" cy="16" rx="18" ry="6" fill="none" stroke="#FFD23F" stroke-width="6"/>',
    };
    return svg('<rect x="28" y="72" width="44" height="30" rx="14" fill="#8C6CFF"/>' +
      '<circle cx="50" cy="52" r="22" fill="#F6C9A0"/><circle cx="43" cy="52" r="3" fill="' + INK + '" stroke="none"/><circle cx="57" cy="52" r="3" fill="' + INK + '" stroke="none"/>' +
      '<path d="M44 61q6 5 12 0" fill="none"/>' + (hats[hat] || ''), '');
  }

  // A few pieces of a confetti style, for previews.
  function confettiSample(style) {
    const colors = ['#FF5FA2', '#FFD23F', '#4CC9F0', '#3DDC97', '#8C6CFF'];
    const spots = [[24, 26, -20], [66, 20, 25], [44, 52, 10], [76, 62, -30], [26, 74, 35]];
    let out = '';
    spots.forEach(function (p, k) {
      const c = colors[k], t = 'transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')"';
      if (style === 'hearts') out += '<path d="M' + p[0] + ' ' + (p[1] + 9) + 'c-10-7-12-12-12-16c0-4 3-7 6-7c3 0 5 2 6 4c1-2 3-4 6-4c3 0 6 3 6 7c0 4-2 9-12 16z" fill="' + c + '" stroke-width="2.5" ' + t + '/>';
      else if (style === 'stars') out += '<path d="' + star5(p[0], p[1], 12, 5) + '" fill="' + c + '" stroke-width="2.5"/>';
      else if (style === 'sprinkles') out += '<rect x="' + (p[0] - 11) + '" y="' + (p[1] - 3.5) + '" width="22" height="7" rx="3.5" fill="' + c + '" stroke-width="2.5" ' + t + '/>';
      else out += '<rect x="' + (p[0] - 7) + '" y="' + (p[1] - 9) + '" width="14" height="18" rx="3" fill="' + c + '" stroke-width="2.5" ' + t + '/>';
    });
    return svg(out, '');
  }

  function sprinkle() {
    return svg('<g transform="rotate(35 50 50)"><rect x="38" y="12" width="24" height="76" rx="12" fill="#FFC93C" stroke-width="7"/>' +
      '<path d="M45 26v22" fill="none" stroke="#FFF7C2" stroke-width="6"/></g>', 'golden sprinkles');
  }

  function sprinkleJar() {
    const colors = ['#FF5FA2', '#4CC9F0', '#3DDC97', '#FFD23F', '#8C6CFF', '#FF9F43'];
    let bits = '';
    for (let k = 0; k < 26; k++) {
      const x = 30 + ((k * 37) % 40), y = 50 + ((k * 23) % 36), a = (k * 47) % 180;
      bits += '<rect x="' + (x - 5) + '" y="' + (y - 2) + '" width="10" height="4" rx="2" transform="rotate(' + a + ' ' + x + ' ' + y + ')" fill="' + (k % 5 === 0 ? '#FFC93C' : colors[k % colors.length]) + '" stroke="none"/>';
    }
    return svg('<ellipse cx="50" cy="93" rx="30" ry="4" fill="' + INK + '" opacity=".14" stroke="none"/>' +
      '<path d="M24 36q0-6 6-6h40q6 0 6 6v46q0 8-8 8h-36q-8 0-8-8z" fill="#E8FAFF"/>' + bits +
      '<path d="M24 36q0-6 6-6h40q6 0 6 6v46q0 8-8 8h-36q-8 0-8-8z" fill="none"/>' +
      '<rect x="28" y="16" width="44" height="14" rx="4" fill="#FF5FA2"/>' +
      '<path d="M32 40v30" fill="none" stroke="#FFFFFF" stroke-width="4" opacity=".8"/>' +
      sparkle(84, 20, 8, '#FFE14D') + sparkle(16, 46, 6, '#FFE14D'), 'jar of golden sprinkles');
  }

  function trophy(lit) {
    const gold = lit ? '#FFC93C' : '#DCD6EA', band = lit ? '#FF5FA2' : '#C4BCD8';
    return svg('<path d="M30 20h40v18a20 20 0 0 1-40 0z" fill="' + gold + '"/>' +
      '<path d="M30 26h-10q0 18 14 18M70 26h10q0 18-14 18" fill="none"/>' +
      '<path d="M44 58h12v12h-12z" fill="' + gold + '"/><rect x="32" y="70" width="36" height="12" rx="3" fill="' + band + '"/>' +
      (lit ? '<path d="M38 26v10" fill="none" stroke="#FFF7C2" stroke-width="4"/>' : ''), '');
  }

  function crown() {
    return svg('<path d="M14 78V32l20 18l16-28l16 28l20-18v46z" fill="#FFD23F"/>' +
      '<rect x="14" y="70" width="72" height="12" rx="3" fill="#FFC93C"/>' +
      '<circle cx="50" cy="52" r="6" fill="#FF5FA2"/><circle cx="30" cy="60" r="4" fill="#4CC9F0"/><circle cx="70" cy="60" r="4" fill="#3DDC97"/>', 'VIP');
  }

  function balloon(color) {
    return svg('<path d="M50 74q-6 10 2 18t-2 18" fill="none" stroke-width="2.5"/>' +
      '<path d="M50 6c18 0 30 14 30 32c0 20-16 36-30 36s-30-16-30-36c0-18 12-32 30-32z" fill="' + color + '"/>' +
      '<path d="M45 74h10l-5 6z" fill="' + color + '"/>' +
      '<path d="M32 30q4-12 16-14" fill="none" stroke="#FFFFFF" stroke-width="5" opacity=".85"/>' +
      sparkle(54, 42, 11, '#FFE14D'), 'lucky balloon', '0 0 100 120');
  }

  // Tab bar and button icons drawn on a 24px grid.
  function icon(name) {
    const paths = {
      town: '<path d="M3 11l9-7l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6h-5a1 1 0 0 1-1-1z"/>',
      managers: '<circle cx="12" cy="9" r="5"/><path d="M3 21c1-5 5-7 9-7s8 2 9 7"/>',
      upgrades: '<path d="M12 3l7 8h-4v9h-6v-9h-4z"/>',
      sprinkles: '<rect x="9" y="2" width="6" height="20" rx="3" transform="rotate(35 12 12)"/>',
      more: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M12 14v4M8 21h8"/><path d="M7 6h-3q0 4 3 5M17 6h3q0 4-3 5"/>',
      soundOn: '<path d="M4 9h4l5-4v14l-5-4h-4z"/><path d="M16 9q2 3 0 6M18.5 6.5q4 5.5 0 11"/>',
      soundOff: '<path d="M4 9h4l5-4v14l-5-4h-4z"/><path d="M16 9l5 6M21 9l-5 6"/>',
      close: '<path d="M6 6l12 12M18 6l-12 12"/>',
      clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 3h4"/>',
      chevron: '<path d="M6 9l6 6l6-6"/>',
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">' + paths[name] + '</g></svg>';
  }

  // The Turbo lightning bolt.
  function bolt() {
    return svg('<path d="M60 4L16 58h30l-8 38l46-56h-30z" fill="#FFD23F" stroke-width="7"/>', 'turbo');
  }

  root.Art = { shop: shop, product: product, mystery: mystery, face: face, coin: coin, setCoinStyle: setCoinStyle,
    setFrontStyle: setFrontStyle, van: van, bolt: bolt,
    customer: customer, confettiSample: confettiSample, sprinkle: sprinkle, sprinkleJar: sprinkleJar, trophy: trophy, crown: crown, balloon: balloon, icon: icon };
})(this);
