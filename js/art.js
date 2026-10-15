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
  };

  function shop(id) {
    if (SHOPS[id]) return svg(SHOPS[id](), '');
    const art = STREET_ART[id];
    return svg(BUILDINGS[art[0]](art[1], id), '');
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
  };

  function face(animal, color, acc) {
    return svg((ANIMALS[animal] || ANIMALS.cat)(color) + (ACCESSORIES[acc] || ''), '');
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
  };

  function product(id) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><g stroke="' + INK + '" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">' + (PRODUCTS[id] || '') + '</g></svg>';
  }

  // ---------------------------------------------------------------------------
  // Small icons
  // ---------------------------------------------------------------------------
  function coin() {
    return svg('<circle cx="50" cy="50" r="40" fill="#FFC93C" stroke-width="7"/><circle cx="50" cy="50" r="27" fill="none" stroke="#E09A00" stroke-width="5"/>' +
      sparkle(50, 50, 15, '#FFF3B0').replace('stroke-width="2"', 'stroke="none"') +
      '<path d="M30 30a28 28 0 0 1 14-8" fill="none" stroke="#FFFFFF" stroke-width="5"/>', 'coins');
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

  root.Art = { shop: shop, product: product, mystery: mystery, face: face, coin: coin, sprinkle: sprinkle, sprinkleJar: sprinkleJar, trophy: trophy, crown: crown, balloon: balloon, icon: icon };
})(this);
