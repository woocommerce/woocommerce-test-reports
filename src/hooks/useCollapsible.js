import { useCallback } from 'react';

export function useCollapsible() {
	const toggleVisibility = useCallback((suiteIndex) => {
		const collapsible = document.querySelector(`#suite-${suiteIndex}`);
		if (collapsible) {
			collapsible.classList.toggle('collapsed');
		}
		const collapseBtnElement = document.getElementById(`btn-${suiteIndex}`);
		if (collapseBtnElement) {
			collapseBtnElement.classList.toggle('collapsed');
		}
	}, []);

	const toggleAll = useCallback((shouldExpand) => {
		const suiteElements = document.querySelectorAll('[id^="suite-"]');
		const buttons = document.querySelectorAll('[id^="btn-"]');

		suiteElements.forEach(element => {
			if (shouldExpand) {
				element.classList.remove('collapsed');
			} else {
				element.classList.add('collapsed');
			}
		});

		buttons.forEach(button => {
			if (shouldExpand) {
				button.classList.remove('collapsed');
			} else {
				button.classList.add('collapsed');
			}
		});
	}, []);

	return {
		toggleVisibility,
		toggleAll,
	};
}