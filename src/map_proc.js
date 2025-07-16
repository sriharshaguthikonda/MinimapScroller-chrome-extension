let observer = null;

function init() {
	window.addEventListener("load", function() {
		if (document.body.contains(document.getElementById('dom-minimap-container')))
			return;
			
		let renderTimeout = null;
		let lastRenderTime = 0;
		let renderUID = 0;
		
		// Add languette
		const languette = document.createElement('div');
		languette.id = 'languette';
		languette.innerText = 'Minimap';
		document.body.appendChild(languette);

		// Add minimap container to the page
                const minimapContainer = document.createElement('div');
                minimapContainer.id = 'dom-minimap-container';
                document.body.appendChild(minimapContainer);
                // Keep minimap visible by default
                minimapContainer.style.right = '0px';
		
		// Scrollbox canvas
		const canvass = document.createElement('canvas');
		canvass.id = 'dom-scrollbox';
		canvass.style.transition = 'opacity 0.3s';
		minimapContainer.appendChild(canvass);
		const ctxs = canvass.getContext('2d');
		
		// Minimap canvas
		const canvasm = document.createElement('canvas');
		canvasm.id = 'dom-minimap';
		canvasm.style.transition = 'opacity 0.3s';
		minimapContainer.appendChild(canvasm);
		const ctxm = canvasm.getContext('2d');

		// Variables for scrolling
		let isDragging = false;

		const renderScrollbox = () => {
			canvass.width = document.body.getBoundingClientRect().width * 0.1;
			canvass.height = window.innerHeight;
			
			ctxs.clearRect(0, 0, canvass.width, canvass.height);
			
			ctxs.fillStyle = "transparent";
			ctxs.fillRect(0, 0, canvass.width, canvass.height);
			
			// Draw viewport rectangle
			const viewportT = (window.scrollY / document.body.scrollHeight) * canvass.height;
			const viewportH = (window.innerHeight / document.body.scrollHeight) * canvass.height;

			ctxs.fillStyle = 'rgba(255,0,0,.25)';
			ctxs.fillRect(0, viewportT, canvass.width, viewportH);
			ctxs.strokeStyle = 'rgba(255,0,0,.5)';
			ctxs.strokeRect(0, viewportT, canvass.width, viewportH);
		};

		function isVisible(element) {
				const style = getComputedStyle(element);
				return style.display !== 'none' &&
							 style.visibility !== 'hidden' &&
							 style.opacity !== '0';
		}


		// Render DOM to minimap
		const renderMinimap = () => {
			// Update the UID render
			renderUID += 1;

			// Adjust canvas dimensions to fit the container height (100vh)
			const rect = document.body.getBoundingClientRect();
			canvasm.width = rect.width * 0.1;
			canvasm.height = window.innerHeight;

			ctxm.clearRect(0, 0, canvasm.width, canvasm.height);
			
			ctxm.fillStyle = "white";
			ctxm.fillRect(0, 0, canvasm.width, canvasm.height);

			// Calculate the vertical scaling factor
			const verticalScaleM = canvasm.height / document.body.scrollHeight;

			const renderElement = (element, offsetX, offsetY) => {
				// Ignore minimap
				if (element.id === 'dom-minimap-container') return;
				
				const elemStyle = window.getComputedStyle(element, null);
				const arrStyle = element.currentStyle || elemStyle;
				const elRect = element.getBoundingClientRect();
				
				const x = (elRect.x + offsetX) * 0.1;
				const y = (elRect.y + offsetY) * verticalScaleM;
				const width = elRect.width * 0.1;
				const height = elRect.height * verticalScaleM;

				// Get the element's background color
				let bgColor = arrStyle.backgroundColor;
				bgColor = (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' ? bgColor : undefined);
				
				if (isVisible(element)
					&& arrStyle.position !== 'fixed'
					&& width !== 0
					&& height !== 0) {
					if (element.tagName === 'A'
					|| element.tagName === 'P') {
						ctxm.fillStyle = arrStyle.color;
						ctxm.fillRect(x, y, width, height);
					}
					else if (bgColor !== undefined
					 && element.nodeType === 1) { // === Node.ELEMENT_NODE
						ctxm.fillStyle = bgColor;
						ctxm.fillRect(x, y, width, height);
					}
				}

				Array.from(element.children).forEach((child) =>
					renderElement(child, offsetX, offsetY)
				);
			};

			renderElement(document.body, -rect.left, -rect.top);
			renderScrollbox();
			renderTimeout = null;
		};

		// Map minimap click to scroll position
		const scrollToPosition = (event) => {
			const rect = canvass.getBoundingClientRect();

			// Calculate the percentage of the minimap height that was clicked
			const clickPercent = (event.clientY - rect.top) / rect.height;

			// Calculate the corresponding scroll position in the document
			const newScrollY = clickPercent * document.body.scrollHeight;

			// Calculate the offset to center the clicked position in the viewport
			const centerOffset = newScrollY - (window.innerHeight / 2);

			// Scroll to the calculated position, ensuring that the clicked point is centered
			window.scrollTo({ top: centerOffset, behavior: 'instant' });
		};

		// Handle drag scrolling
		const handleMouseDown = (event) => {
			document.getElementById("dom-minimap-container").style.cursor = "grabbing";
			isDragging = true;
			scrollToPosition(event);
		};

		const handleMouseMove = (event) => {
			if (isDragging)
				scrollToPosition(event);
		};

		const handleMouseUp = () => {
			document.getElementById("dom-minimap-container").style.cursor = "grab";
			isDragging = false;
		};

                // Keep minimap visible at all times
                canvass.addEventListener('mousedown', handleMouseDown);
                canvass.addEventListener('mousemove', handleMouseMove);
                canvass.addEventListener('mouseup', handleMouseUp);
                canvass.addEventListener('mouseleave', handleMouseUp);
                document.getElementById('languette').addEventListener('mouseenter', function (e) {
                        scheduleRender(true);
                });


		// Schedule render based on DOM mutation
		const scheduleRender = (_force = false) => {
			const mmCont = document.getElementById('dom-minimap-container');
			
			if (mmCont) {
				const mmStyle = window.getComputedStyle(mmCont, null);
				const arrStyle = mmCont.currentStyle || mmStyle;
				
				if (Date.now() - lastRenderTime < 2000) {
					if (renderTimeout !== null) {
						clearTimeout(renderTimeout);
						renderTimeout = setTimeout(() => {
							if (_force
							|| parseInt(arrStyle.right) > -101) {
								renderMinimap();
								lastRenderTime = Date.now();
							}
						}, 2000);
					}
				} else if (_force
				|| parseInt(arrStyle.right) > -101) {
					clearTimeout(renderTimeout);
					renderMinimap();
					lastRenderTime = Date.now();
				}
			}
		};

		// Observe DOM changes
		observer = new MutationObserver((e) => {
			e.forEach(elm => {
				if ((elm.type === 'childList' || elm.attributeName === 'style')
				&& elm.target.id !== 'dom-minimap'
				&& elm.target.id !== 'dom-scrollbox'
				&& elm.target.id !== 'dom-minimap-container'
				&& elm.target.id !== 'dom-button-hide') {
					scheduleRender();
					renderScrollbox();
					return;
				}
			});
		});
		observer.observe(document.body, { childList: true, subtree: true, attributes: false });

		// Handle scroll events to update viewport rectangle
		window.addEventListener('scroll', () => {
			renderScrollbox();
		});

		// Adjust canvas size on window resize
		window.addEventListener('resize', () => {
			scheduleRender();
		});
	});
}

function desinit() {
	if (document.body.contains(document.getElementById('dom-minimap-container'))) {
		document.getElementById('dom-minimap-container').remove();
		document.getElementById('languette').remove();
		observer.disconnect();
	}
}