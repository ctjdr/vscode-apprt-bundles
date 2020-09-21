import {run } from './suite/index';

async function main() {
	try {

		await run();

	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();
