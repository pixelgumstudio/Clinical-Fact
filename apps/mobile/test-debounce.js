// Simple debounce test to verify logic
const debounce = (fn, delay) => {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Simulate user typing "ABC" character by character
const validateCalls = [];
const mockValidate = (text) => {
  validateCalls.push({ text, time: Date.now() });
  console.log(`✓ Validation called for: "${text}"`);
};

const debouncedValidate = debounce(mockValidate, 300);

console.log('=== Simulating rapid typing: A → AB → ABC ===');
const start = Date.now();

// Simulate typing at 50ms intervals (fast typing)
setTimeout(() => { debouncedValidate('A'); console.log('Typed: A'); }, 0);
setTimeout(() => { debouncedValidate('AB'); console.log('Typed: AB'); }, 50);
setTimeout(() => { debouncedValidate('ABC'); console.log('Typed: ABC'); }, 100);

// Wait for debounce to complete
setTimeout(() => {
  const elapsed = Date.now() - start;
  console.log(`\n=== Results after ${elapsed}ms ===`);
  console.log(`Total validation calls: ${validateCalls.length}`);
  console.log(`Expected: 1 call (only for "ABC")`);
  
  if (validateCalls.length === 1 && validateCalls[0].text === 'ABC') {
    console.log('✅ PASS: Debounce working correctly!');
  } else {
    console.log('❌ FAIL: Race condition detected');
    validateCalls.forEach(c => console.log(`  - "${c.text}"`));
  }
}, 500);
