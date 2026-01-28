const vscode = require('vscode');

function getDateInString(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getTodayString() {
	const today = new Date();
	return getDateInString(today);
}

function getYesterdayString() {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	return getDateInString(yesterday);
}

function setupCommitListener(repo, context, statusBarItem) {
	const todayStr = getTodayString();
	const yesterdayStr = getYesterdayString();
	let streak = context.globalState.get("streak");

	const disposable = repo.onDidCommit(() => {
		const currentLastDay = context.globalState.get("lastDayCommit");

		if (!currentLastDay || (currentLastDay !== todayStr && currentLastDay !== yesterdayStr)) {
			streak = 1;
			context.globalState.update("streak", 1);
		} else if (currentLastDay === yesterdayStr) {
			streak++;
			context.globalState.update("streak", streak);
		}
		context.globalState.update("lastDayCommit", todayStr);

		statusBarItem.text = `$(flame) ${streak}`;
	});
	context.subscriptions.push(disposable);
}

function activate(context) {
	const gitExtension = vscode.extensions.getExtension('vscode.git');
	const todayStr = getTodayString();
	const yesterdayStr = getYesterdayString();

	let streak = context.globalState.get("streak");
	const lastDayCommit = context.globalState.get("lastDayCommit");

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.text = `$(flame) ${streak}`;
	statusBarItem.tooltip = "Commit Streak"

	if (!gitExtension) {
		vscode.window.showErrorMessage("Git extension not found");
		return;
	}

	if (!lastDayCommit || (lastDayCommit !== todayStr && lastDayCommit !== yesterdayStr)) {
		context.globalState.update("streak", 0);
	}

	context.subscriptions.push(vscode.commands.registerCommand('commit-streak.resetStreak', () => {
		context.globalState.update("lastDayCommit", undefined);
		context.globalState.update("streak", undefined);
		statusBarItem.text = `$(flame) 0`;
		vscode.window.showInformationMessage('Streak reset');
	}));

	let git = undefined
	try {
		git = gitExtension.exports.getAPI(1);
	} catch {
		vscode.window.showErrorMessage("Git not found")
		return;
	}

    const disposable = git.onDidOpenRepository((repo) => {
		setupCommitListener(repo, context, statusBarItem);
    });

	context.subscriptions.push(disposable);

	git.repositories.forEach((repo) => {
		setupCommitListener(repo, context, statusBarItem);
	});

	statusBarItem.show();
	context.subscriptions.push(statusBarItem);
}
module.exports = {
	activate,
}
