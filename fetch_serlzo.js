async function run() {
  const res = await fetch('https://cdn.serlzo.com/form/get-form-config/69dcf7c9fa683a8aebdf3ca7');
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
run();
