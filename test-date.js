const d = new Date('2026-08-07T00:47:00+05:00');
console.log(d.toISOString().split('T')[0]);
console.log(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
