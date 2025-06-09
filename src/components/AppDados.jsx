/*
EsMiOptica Dados
2025-06-08

To install dependencies:

```bash
npm create vite@latest esmioptica-dados -- --template react
cd esmioptica-dados
npm install firebase
```

To run:

```bash
npm run dev
```
*/
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, addDoc, getDocs, Timestamp } from 'firebase/firestore';

import esmiOpticaLogo from '../assets/esmioptica.logo.jpg'


const useDatabase = (process.env.REACT_APP_USE_DATABASE || '0') === '1';

// Componente para la animación de confeti
const Confetti = ({ onComplete }) => {
    useEffect(() => {
        const createConfetti = (count) => {
            const container = document.createElement('div');
            container.className = 'confetti-container';
            document.body.appendChild(container);

            for (let i = 0; i < count; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = `${Math.random() * 100}vw`;
                confetti.style.animationDelay = `${Math.random() * 2}s`;
                confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
                container.appendChild(confetti);
            }

            const timer = setTimeout(() => {
                container.remove();
                if (onComplete) onComplete();
            }, 3000); 

            return () => clearTimeout(timer);
        };

        createConfetti(100); 
    }, [onComplete]);

    return null; 
};

// Main App component for the "Lanza el Dado y Gana" game
const AppDados = () => {
    // Firebase related states
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Game specific states
    const [gamePhase, setGamePhase] = useState('initial'); // 'initial', 'playing', 'result', 'form', 'success', 'eye-tips', 'error'
    const [rollResult, setRollResult] = useState(null);
    const [prize, setPrize] = useState(null);
    const [prizeCode, setPrizeCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [acceptMarketing, setAcceptMarketing] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [hasPlayed, setHasPlayed] = useState(false); // To prevent multiple plays per email

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('info'); // 'info', 'success', 'error'

    // AI Feature states
    const [eyeConcern, setEyeConcern] = useState('');
    const [generatedTips, setGeneratedTips] = useState('');
    const [isGeneratingTips, setIsGeneratingTips] = useState(false);

    // References for dice animation
    const diceRef = useRef(null);

    // Define the prizes for each dice face. Prize ID directly maps to dice roll.
    // "Lentes GRATIS" is NOT included here as it's an in-store prize.
    const PRIZES = [
        { id: 1, name: 'Gafas de sol', description: '¡Felicidades! Has ganado un par de gafas de sol para proteger tu mirada.', icon: '😎' },
        { id: 2, name: 'Kit de limpieza', description: 'Mantén tus lentes impecables con nuestro kit de limpieza premium.', icon: '👁️' },
        { id: 3, name: '50% de descuento en tu próxima compra', description: 'Aprovecha un gran descuento en tu próxima compra en EsmiÓptica.', icon: '🏷️' },
        { id: 4, name: 'Cordón para gafas', description: 'Un práctico y elegante cordón para tus gafas.', icon: '🔗' },
        { id: 5, name: 'Perfume', description: 'Perfume exclusivo de EsmiÓptica.', icon: '🧴' },
        { id: 6, name: '15% de descuento en la montura de tu elección', description: 'Elige tu montura ideal con un 15% de descuento.', icon: '🎁' }
    ];

    // Initialize Firebase
    useEffect(() => {
        try {
            // const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
            // const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

            const firebaseConfig = {
                apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
                authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
                storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.REACT_APP_FIREBASE_APP_ID,
                measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
            };

            const appId = process.env.REACT_APP_CANVAS_APP_ID || 'default-app-id'; // Usar un default si la variable no está

            if (firebaseConfig && useDatabase) {
                const app = initializeApp(firebaseConfig);
                const firestoreDb = getFirestore(app);
                const firebaseAuth = getAuth(app);

                setDb(firestoreDb);
                setAuth(firebaseAuth);

                // Authenticate user
                const signIn = async () => {
                    try {
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                        } else {
                            await signInAnonymously(firebaseAuth);
                        }
                    } catch (error) {
                        console.error("Error during Firebase authentication:", error);
                    } finally {
                        setIsAuthReady(true);
                    }
                };

                onAuthStateChanged(firebaseAuth, (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        setUserId(crypto.randomUUID());
                    }
                    setIsAuthReady(true);
                });

                signIn();
            } else {
                console.error("Firebase config not found.");
                setIsAuthReady(true);
            }
        } catch (error) {
            console.error("Failed to initialize Firebase:", error);
            setIsAuthReady(true);
        }
    }, []);

    // Custom Modal Component
    const CustomModal = ({ message, type, onClose }) => {
        let bgColor = 'bg-blue-500';
        let borderColor = 'border-blue-700';
        let textColor = 'text-white';

        if (type === 'success') {
            bgColor = 'bg-green-500';
            borderColor = 'border-green-700';
        } else if (type === 'error') {
            bgColor = 'bg-red-500';
            borderColor = 'border-red-700';
        }

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className={`relative ${bgColor} ${borderColor} border-2 rounded-lg p-6 shadow-xl max-w-md w-full`}>
                    <p className={`text-lg font-semibold ${textColor} mb-4`}>{message}</p>
                    <button
                        onClick={onClose}
                        className="w-full bg-white text-gray-800 font-bold py-2 px-4 rounded-full hover:bg-gray-200 transition duration-300"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        );
    };

    // Helper to show modal
    const showInfoModal = (message, type = 'info') => {
        setModalMessage(message);
        setModalType(type);
        setShowModal(true);
    };

    // Validate email format
    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    // Generate a unique prize code
    const generatePrizeCode = () => {
        const timestamp = new Date().getTime().toString(36);
        const randomString = Math.random().toString(36).substring(2, 8);
        return `ESM-${timestamp.toUpperCase()}-${randomString.toUpperCase()}`;
    };

    // Handle dice roll
    const handleRollDice = async () => {
        if (isLoading) return;

        if (useDatabase && (!isAuthReady || !db || !userId)) {
            showInfoModal("El sistema no está listo. Por favor, espera un momento o recarga la página.", 'error');
            return;
        }

        if (userEmail && hasPlayed) {
            showInfoModal("Ya has jugado con este correo electrónico. ¡Solo se permite un lanzamiento por persona!", 'info');
            return;
        }

        setIsLoading(true);
        setGamePhase('playing');
        setEmailError('');

        const randomRoll = Math.floor(Math.random() * 6) + 1;
        setRollResult(null);

        if (diceRef.current) {
            diceRef.current.style.transition = 'none';
            diceRef.current.style.transform = `translateZ(-100px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;

            setTimeout(() => {
                diceRef.current.style.transition = 'transform 2s ease-out';
                let xDeg, yDeg, zDeg;

                switch (randomRoll) {
                    case 1: xDeg = 0; yDeg = 0; zDeg = 0; break; 
                    case 2: xDeg = 0; yDeg = 90; zDeg = 0; break;
                    case 3: xDeg = -90; yDeg = 0; zDeg = 0; break;
                    case 4: xDeg = 90; yDeg = 0; zDeg = 0; break;
                    case 5: xDeg = 0; yDeg = -90; zDeg = 0; break;
                    case 6: xDeg = 180; yDeg = 0; zDeg = 0; break;
                    default: xDeg = 0; yDeg = 0; zDeg = 0; break;
                }

                const spinX = Math.floor(Math.random() * 5 + 3) * 360;
                const spinY = Math.floor(Math.random() * 5 + 3) * 360;
                const spinZ = Math.floor(Math.random() * 5 + 3) * 360;

                diceRef.current.style.transform = `translateZ(-100px) rotateX(${xDeg + spinX}deg) rotateY(${yDeg + spinY}deg) rotateZ(${zDeg + spinZ}deg)`;

                setTimeout(() => {
                    setRollResult(randomRoll);
                    const wonPrize = PRIZES.find(p => p.id === randomRoll);
                    setPrize(wonPrize);
                    setPrizeCode(generatePrizeCode());
                    setGamePhase('result');
                    setIsLoading(false);
                }, 2000);
            }, 50);
        } else {
            const wonPrize = PRIZES.find(p => p.id === randomRoll);
            setPrize(wonPrize);
            setPrizeCode(generatePrizeCode());
            setRollResult(randomRoll);
            setGamePhase('result');
            setIsLoading(false);
        }
    };

    // Handle form submission after winning
    const handleSubmitForm = async (e) => {
        e.preventDefault();
        setEmailError('');

        if (!isValidEmail(userEmail)) {
            setEmailError('Por favor, ingresa un correo electrónico válido.');
            return;
        }

        if (!useDatabase) {
            showInfoModal("Gracias por participar. Tu premio se generó exitosamente.", 'success');
            return;
        }

        if (!isAuthReady || !db || !userId) {
            showInfoModal("El sistema no está listo. Por favor, espera un momento o recarga la página.", 'error');
            return;
        }

        setIsLoading(true);

        try {
            const gameLeadsCollection = collection(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', 'public', 'data', 'game_leads');
            const q = query(gameLeadsCollection, where('email', '==', userEmail));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                showInfoModal("Este correo electrónico ya ha participado. ¡Solo se permite un lanzamiento por persona!", 'info');
                setHasPlayed(true);
                setGamePhase('initial');
                setIsLoading(false);
                return;
            }

            const issuedAt = Timestamp.now();
            const expiresAt = new Timestamp(issuedAt.seconds + (30 * 24 * 60 * 60), issuedAt.nanoseconds);

            await addDoc(gameLeadsCollection, {
                userId: userId,
                email: userEmail,
                name: userName,
                phone: userPhone,
                prize: prize.name,
                prizeCode: prizeCode,
                issuedAt: issuedAt,
                expiresAt: expiresAt,
                redeemed: false,
                redemptionDate: null,
                acceptMarketing: acceptMarketing
            });

            await simulateEmailSend(userEmail, prize.name, prizeCode, expiresAt.toDate().toLocaleDateString('es-ES'));

            setGamePhase('success');
        } catch (error) {
            console.error("Error al guardar el premio o simular el envío de email:", error);
            showInfoModal("Ocurrió un error al procesar tu premio. Por favor, inténtalo de nuevo.", 'error');
            setGamePhase('error');
        } finally {
            setIsLoading(false);
        }
    };

    // Simulate sending email using LLM API
    const simulateEmailSend = async (email, prizeName, code, expiryDate) => {
        const prompt = `Simula un correo electrónico amigable de confirmación de premio de EsmiÓptica. El correo debe ir dirigido a ${email}. 
        El usuario ha ganado "${prizeName}". El código para canjear el premio es "${code}". 
        La fecha de caducidad del código es ${expiryDate}. 
        Recuérdale al usuario que debe presentar el código en la tienda de EsmiÓptica en C.C Premium Plaza, Medellín. 
        El tono debe ser entusiasta y profesional.`;

        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = { contents: chatHistory };
        const apiKey = ""; // Canvas will provide this in runtime

        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} - ${errorData.error.message || 'Unknown error'}`);
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                console.log("Simulated Email Content:\n", text);
                showInfoModal(`¡Tu premio se ha enviado a tu correo (${email})! Recibiste: ${prizeName}. Código: ${code}. Presenta este código en EsmiÓptica, C.C Premium Plaza.`, 'success');
            } else {
                console.warn("LLM response structure unexpected for email simulation.");
                showInfoModal(`¡Felicidades! Ganaste: ${prizeName}. Código: ${code}. Hubo un problema al enviar el correo, pero puedes canjear tu premio con este código en EsmiÓptica, C.C Premium Plaza.`, 'info');
            }
        } catch (llmError) {
            console.error("Error calling LLM for email simulation:", llmError);
            showInfoModal(`¡Felicidades! Ganaste: ${prizeName}. Código: ${code}. No pudimos enviar el correo, pero puedes canjear tu premio con este código en EsmiÓptica, C.C Premium Plaza.`, 'info');
        }
    };

    // Generate Eye Health Tips using LLM API
    const generateEyeTips = async () => {
        if (!eyeConcern) {
            showInfoModal("Por favor, describe tu preocupación para obtener consejos personalizados.", 'info');
            return;
        }

        setIsGeneratingTips(true);
        setGeneratedTips('');

        const prompt = `Genera 3 consejos breves y prácticos para el cuidado de los ojos basados en la siguiente preocupación: "${eyeConcern}". Asegúrate de que los consejos sean fáciles de entender y aplicar.`;

        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = { contents: chatHistory };
        const apiKey = ""; // Canvas will provide this in runtime

        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} - ${errorData.error.message || 'Unknown error'}`);
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                setGeneratedTips(text);
            } else {
                setGeneratedTips("No pudimos generar consejos en este momento. Inténtalo de nuevo más tarde.");
            }
        } catch (llmError) {
            console.error("Error calling LLM for eye tips:", llmError);
            setGeneratedTips("Hubo un error al generar los consejos. Por favor, inténtalo de nuevo.");
        } finally {
            setIsGeneratingTips(false);
        }
    };

    // Reset game to initial state
    const resetGame = () => {
        setGamePhase('initial');
        setRollResult(null);
        setPrize(null);
        setPrizeCode('');
        setUserEmail('');
        setUserName('');
        setUserPhone('');
        setAcceptMarketing(false);
        setEmailError('');
        setHasPlayed(false);
        setEyeConcern(''); // Reset AI feature states
        setGeneratedTips('');
    };

    if (useDatabase && !isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4">
                <div className="text-center text-white">
                    <p className="text-xl font-semibold mb-4">Cargando aplicación EsmiÓptica...</p>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                </div>
            </div>
        );
    }

    // Function to render dice dots based on number
    const renderDiceDots = (num) => {
        const dots = [];
        const dotClasses = "dice-dot w-4 h-4 bg-black rounded-full";

        // Logic for placing dots on the dice face
        // This attempts to visually represent the dots like a real dice.
        // For more complex and precise rendering of dice faces, SVG or more advanced 3D rendering might be needed.
        switch (num) {
            case 1:
                dots.push(<div key={1} className={`${dotClasses} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}></div>);
                break;
            case 2:
                dots.push(<div key={1} className={`${dotClasses} absolute top-4 left-4`}></div>);
                dots.push(<div key={2} className={`${dotClasses} absolute bottom-4 right-4`}></div>);
                break;
            case 3:
                dots.push(<div key={1} className={`${dotClasses} absolute top-4 left-4`}></div>);
                dots.push(<div key={2} className={`${dotClasses} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}></div>);
                dots.push(<div key={3} className={`${dotClasses} absolute bottom-4 right-4`}></div>);
                break;
            case 4:
                dots.push(<div key={1} className={`${dotClasses} absolute top-4 left-4`}></div>);
                dots.push(<div key={2} className={`${dotClasses} absolute top-4 right-4`}></div>);
                dots.push(<div key={3} className={`${dotClasses} absolute bottom-4 left-4`}></div>);
                dots.push(<div key={4} className={`${dotClasses} absolute bottom-4 right-4`}></div>);
                break;
            case 5:
                dots.push(<div key={1} className={`${dotClasses} absolute top-4 left-4`}></div>);
                dots.push(<div key={2} className={`${dotClasses} absolute top-4 right-4`}></div>);
                dots.push(<div key={3} className={`${dotClasses} absolute bottom-4 left-4`}></div>);
                dots.push(<div key={4} className={`${dotClasses} absolute bottom-4 right-4`}></div>);
                dots.push(<div key={5} className={`${dotClasses} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}></div>);
                break;
            case 6:
                dots.push(<div key={1} className={`${dotClasses} absolute top-4 left-4`}></div>);
                dots.push(<div key={2} className={`${dotClasses} absolute top-4 right-4`}></div>);
                dots.push(<div key={3} className={`${dotClasses} absolute top-1/2 left-4 transform -translate-y-1/2`}></div>);
                dots.push(<div key={4} className={`${dotClasses} absolute top-1/2 right-4 transform -translate-y-1/2`}></div>);
                dots.push(<div key={5} className={`${dotClasses} absolute bottom-4 left-4`}></div>);
                dots.push(<div key={6} className={`${dotClasses} absolute bottom-4 right-4`}></div>);
                break;
            default: break;
        }
        return dots;
    };

    // Main render based on game phase
    return (
        // <div className="main-container min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center p-4 font-inter text-gray-800 relative overflow-hidden">
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center p-4 font-inter text-gray-800 relative overflow-hidden">
            {showModal && <CustomModal message={modalMessage} type={modalType} onClose={() => setShowModal(false)} />}
            {gamePhase === 'result' && <Confetti />}

            {/* <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 text-center border-4 border-white relative overflow-hidden"> */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center border-4 border-white relative overflow-hidden">
                {/* Top Right Slogan */}
                <div className="absolute top-0 right-0 bg-yellow-400 text-blue-800 font-bold py-2 px-4 rounded-bl-xl text-sm md:text-base">
                    COMPRA, LANZA Y GANA
                </div>

                {/* Left Side: Title and Main Content */}
                <div className="flex flex-col items-center md:flex-row md:justify-between md:items-start text-left">
                    <div className="flex-1 w-full md:w-auto md:pr-4 mb-6 md:mb-0">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 leading-tight mb-4 animate-fade-in-down text-center md:text-left">
                            LANZA EL DADO <br className="hidden md:block"/> Y GANA
                        </h1>
                        <p className="text-lg text-gray-600 mb-6 text-center md:text-left">
                            ¡Tu suerte te espera en EsmiÓptica! ¡Gira y gana grandes premios!
                        </p>

                        {/* Initial Phase with Dice and Prizes */}
                        {gamePhase === 'initial' && (
                            <div className="flex flex-col items-center">
                                {/* Dice Section */}
                                <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                                    <div className="dice-container w-full h-full relative" style={{ perspective: '500px' }}>
                                        <div ref={diceRef} className="dice w-full h-full transform-style-3d relative">
                                            {[1, 2, 3, 4, 5, 6].map(num => (
                                                <div key={num} className={`dice-face dice-face-${num} absolute inset-0 bg-white border border-gray-300 flex items-center justify-center rounded-lg shadow-md`}>
                                                    <div className={`dot-layout dots-${num}`}>
                                                        {renderDiceDots(num)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Hand pointer */}
                                    <div className="absolute -bottom-10 right-0 transform translate-x-1/2 rotate-12">
                                        <svg className="w-16 h-16 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10.394 2.08a1 1 0 01-.131.144l-3.32 2.946a1 1 0 01-1.468-1.314l.808-.716H5a1 1 0 01-1-1V4a1 1 0 011-1h.295l.43-.382a1 1 0 011.382 1.44l-.43.382H7a1 1 0 011 1v.575l2.452-2.18a1 1 0 011.232 1.51l-2.452 2.18V8a1 1 0 01-1 1h-.295l-.43.382a1 1 0 01-1.382-1.44l.43-.382H7a1 1 0 011-1V5.425l2.452-2.18a1 1 0 011.232 1.51L10.394 2.08z" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRollDice}
                                    disabled={isLoading || (useDatabase && (!isAuthReady || hasPlayed))}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full text-xl transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-8"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></span>
                                            Lanzando...
                                        </>
                                    ) : (
                                        "¡Lanza el Dado!"
                                    )}
                                </button>
                            </div>
                        )}

                        {gamePhase === 'playing' && (
                            <div className="flex flex-col items-center py-10">
                                 <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                                    <div className="dice-container w-full h-full relative" style={{ perspective: '500px' }}>
                                        <div ref={diceRef} className="dice w-full h-full transform-style-3d relative">
                                             {[1, 2, 3, 4, 5, 6].map(num => (
                                                <div key={num} className={`dice-face dice-face-${num} absolute inset-0 bg-white border border-gray-300 flex items-center justify-center rounded-lg shadow-md`}>
                                                    <div className={`dot-layout dots-${num}`}>
                                                        {renderDiceDots(num)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-2xl font-semibold text-blue-600 mb-4 animate-pulse">¡El dado está girando!</p>
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        )}

                        {/* Prize Result Section */}
                        {gamePhase === 'result' && prize && (
                            <div className="animate-fade-in py-10">
                                <p className="text-3xl font-bold text-green-600 mb-4">¡Felicidades! El dado cayó en el {rollResult}.</p>
                                <h2 className="text-4xl font-extrabold text-blue-700 mb-4 animate-bounce-in">
                                    ¡Ganaste {prize.name.toUpperCase()} {prize.icon}!
                                </h2>
                                <p className="text-lg text-gray-700 mb-6">{prize.description}</p>
                                <button
                                    onClick={() => setGamePhase('form')}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full text-xl transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105"
                                >
                                    ¡Obtén tu premio!
                                </button>
                            </div>
                        )}

                        {/* Form Section */}
                        {gamePhase === 'form' && (
                            <div className="animate-fade-in py-6">
                                <h2 className="text-2xl font-bold text-blue-600 mb-6">Ingresa tus datos para recibir tu premio</h2>
                                <form onSubmit={handleSubmitForm} className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-left text-gray-700 text-sm font-bold mb-2">
                                            Correo Electrónico <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={userEmail}
                                            onChange={(e) => {
                                                setUserEmail(e.target.value);
                                                setEmailError(''); 
                                            }}
                                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="tu.correo@ejemplo.com"
                                            required
                                        />
                                        {emailError && <p className="text-red-500 text-xs italic mt-2">{emailError}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="name" className="block text-left text-gray-700 text-sm font-bold mb-2">
                                            Nombre (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Tu nombre"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="phone" className="block text-left text-gray-700 text-sm font-bold mb-2">
                                            Teléfono (Opcional)
                                        </label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            value={userPhone}
                                            onChange={(e) => setUserPhone(e.target.value)}
                                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Ej: 300 1234567"
                                        />
                                    </div>
                                    <div className="flex items-center mt-4">
                                        <input
                                            type="checkbox"
                                            id="acceptMarketing"
                                            checked={acceptMarketing}
                                            onChange={(e) => setAcceptMarketing(e.target.checked)}
                                            className="form-checkbox h-5 w-5 text-blue-600 rounded"
                                        />
                                        <label htmlFor="acceptMarketing" className="ml-2 text-gray-700 text-sm">
                                            Acepto recibir comunicaciones de marketing de EsmiÓptica.
                                        </label>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !isValidEmail(userEmail)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full text-xl transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></span>
                                                Enviando...
                                            </>
                                        ) : (
                                            "¡Enviar y Obtener Código!"
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Success and Error Phases */}
                        {gamePhase === 'success' && (
                            <div className="animate-fade-in py-10">
                                <p className="text-3xl font-bold text-green-600 mb-4">¡Premio canjeado con éxito!</p>
                                <p className="text-xl text-gray-700 mb-4">
                                    Hemos enviado tu código de premio a tu correo electrónico: <span className="font-semibold">{userEmail}</span>.
                                </p>
                                <p className="text-xl text-gray-700 mb-6">
                                    Tu código es: <span className="font-extrabold text-blue-700 text-3xl block my-2">{prizeCode}</span>
                                </p>
                                <p className="text-lg text-gray-600 mb-8">
                                    ¡Presenta este código en nuestra tienda EsmiÓptica en C.C Premium Plaza para hacer válido tu premio!
                                </p>
                                <button
                                    onClick={() => setGamePhase('eye-tips')} // New button to trigger eye tips
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-full text-xl transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 mt-4 flex items-center justify-center"
                                >
                                    Obtén Consejos Personalizados para tus Ojos ✨
                                </button>
                                <button
                                    onClick={resetGame}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full text-xl transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 mt-4"
                                >
                                    Jugar de Nuevo
                                </button>
                            </div>
                        )}

                        {gamePhase === 'eye-tips' && (
                            <div className="animate-fade-in py-6">
                                <h2 className="text-2xl font-bold text-blue-600 mb-6">Consejos Personalizados para tus Ojos ✨</h2>
                                <p className="text-gray-700 mb-4">Cuéntanos, ¿qué te preocupa de tus ojos o de tu visión?</p>
                                <textarea
                                    className="w-full h-28 p-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ej: 'Paso muchas horas frente al computador', 'Siento los ojos secos', 'Quiero prevenir la fatiga visual'."
                                    value={eyeConcern}
                                    onChange={(e) => setEyeConcern(e.target.value)}
                                ></textarea>
                                <button
                                    onClick={generateEyeTips}
                                    disabled={isGeneratingTips || !eyeConcern.trim()}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full text-xl transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
                                >
                                    {isGeneratingTips ? (
                                        <>
                                            <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></span>
                                            Generando consejos...
                                        </>
                                    ) : (
                                        "Generar Consejos ✨"
                                    )}
                                </button>

                                {generatedTips && (
                                    <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-lg text-left">
                                        <h3 className="font-bold text-lg mb-2">Aquí tienes tus consejos:</h3>
                                        <p className="whitespace-pre-wrap">{generatedTips}</p>
                                    </div>
                                )}

                                <button
                                    onClick={resetGame}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full text-xl transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 mt-6"
                                >
                                    Volver a Jugar
                                </button>
                            </div>
                        )}

                        {gamePhase === 'error' && (
                            <div className="animate-fade-in py-10">
                                <p className="text-3xl font-bold text-red-600 mb-4">¡Ups! Algo salió mal.</p>
                                <p className="text-lg text-gray-700 mb-6">
                                    No pudimos procesar tu solicitud en este momento. Por favor, inténtalo de nuevo más tarde o contacta a nuestro soporte.
                                </p>
                                <button
                                    onClick={resetGame}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full text-xl transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105"
                                >
                                    Volver a Intentar
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Prizes List and EsmiÓptica */}
                    <div className="w-full md:w-2/5 bg-white rounded-lg p-6 shadow-md border border-gray-100 mt-6 md:mt-0 md:ml-4">
                        <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">PREMIOS</h2>
                        <ul className="space-y-3">
                            {PRIZES.map(p => (
                                <li key={p.id} className="flex items-center text-gray-600">
                                    <span className="text-2xl mr-3">{p.icon}</span>
                                    {p.name}
                                </li>
                            ))}
                        </ul>
                        {/* "Lentes GRATIS" section - prominent and separate */}
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg mt-6 text-center">
                            <p className="text-xl font-bold">
                                PODRÍAS LLEVARTE LOS <span className="text-red-600">LENTES GRATIS</span>
                            </p>
                            <p className="text-sm mt-1">(¡Premio exclusivo solo en Tienda Física!)</p>
                        </div>

                        {/* EsmiÓptica Branding */}
                        <div className="mt-8 text-center">
                            {/* <svg className="w-16 h-16 mx-auto text-blue-700 mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM4.09 9.38A6.002 6.002 0 0010 16a6.002 6.002 0 005.91-6.62L10 10l-5.91-.62zM10 4a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd"></path></svg>
                            <span className="text-3xl font-extrabold text-blue-800">EsmiÓptica</span> */}
                            <img src={esmiOpticaLogo} alt="EsmiÓptica Logo" className="w-48 mx-auto mb-2" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Styles for dice animation and confetti */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');

                body {
                    font-family: 'Inter', sans-serif;
                }
                
                .dice-container {
                    width: 150px; 
                    height: 150px;
                    position: relative;
                    margin: 0 auto;
                    perspective: 800px; 
                }

                .dice {
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    transform-style: preserve-3d;
                    transition: transform 2s ease-out; 
                    transform: translateZ(-75px); 
                }

                .dice-face {
                    width: 150px;
                    height: 150px;
                    position: absolute;
                    border: 2px solid #ccc;
                    display: flex; /* Use flexbox for dot positioning */
                    align-items: center; /* Center vertically by default */
                    justify-content: center; /* Center horizontally by default */
                    font-size: 2.5rem;
                    font-weight: bold;
                    color: #000;
                    background-color: #fff;
                    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2); 
                    border-radius: 12px; 
                    box-sizing: border-box; /* Include padding/border in element's total width and height */
                }

                /* Positioning for each face */
                .dice-face-1 { transform: rotateY(0deg) translateZ(75px); }
                .dice-face-2 { transform: rotateX(90deg) translateZ(75px); }
                .dice-face-3 { transform: rotateY(90deg) translateZ(75px); }
                .dice-face-4 { transform: rotateY(-90deg) translateZ(75px); }
                .dice-face-5 { transform: rotateX(-90deg) translateZ(75px); }
                .dice-face-6 { transform: rotateX(180deg) translateZ(75px); }

                /* Dice dots common style */
                .dice-dot {
                    background-color: black;
                    border-radius: 50%;
                }

                /* Dot layout for each face - using flex and absolute positioning for precision */
                .dot-layout {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                /* Specific dot arrangements for each face */
                /* Face 1 */
                .dots-1 { } /* Default center alignment */

                /* Face 2 */
                .dots-2 .dice-dot:nth-child(1) { position: absolute; top: 20px; left: 20px; }
                .dots-2 .dice-dot:nth-child(2) { position: absolute; bottom: 20px; right: 20px; }

                /* Face 3 */
                .dots-3 .dice-dot:nth-child(1) { position: absolute; top: 20px; left: 20px; }
                .dots-3 .dice-dot:nth-child(2) { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
                .dots-3 .dice-dot:nth-child(3) { position: absolute; bottom: 20px; right: 20px; }

                /* Face 4 */
                .dots-4 .dice-dot:nth-child(1) { position: absolute; top: 20px; left: 20px; }
                .dots-4 .dice-dot:nth-child(2) { position: absolute; top: 20px; right: 20px; }
                .dots-4 .dice-dot:nth-child(3) { position: absolute; bottom: 20px; left: 20px; }
                .dots-4 .dice-dot:nth-child(4) { position: absolute; bottom: 20px; right: 20px; }

                /* Face 5 */
                .dots-5 .dice-dot:nth-child(1) { position: absolute; top: 20px; left: 20px; }
                .dots-5 .dice-dot:nth-child(2) { position: absolute; top: 20px; right: 20px; }
                .dots-5 .dice-dot:nth-child(3) { position: absolute; bottom: 20px; left: 20px; }
                .dots-5 .dice-dot:nth-child(4) { position: absolute; bottom: 20px; right: 20px; }
                .dots-5 .dice-dot:nth-child(5) { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }

                /* Face 6 */
                .dots-6 .dice-dot:nth-child(1) { position: absolute; top: 20px; left: 20px; }
                .dots-6 .dice-dot:nth-child(2) { position: absolute; top: 20px; right: 20px; }
                .dots-6 .dice-dot:nth-child(3) { position: absolute; top: 50%; left: 20px; transform: translateY(-50%); }
                .dots-6 .dice-dot:nth-child(4) { position: absolute; top: 50%; right: 20px; transform: translateY(-50%); }
                .dots-6 .dice-dot:nth-child(5) { position: absolute; bottom: 20px; left: 20px; }
                .dots-6 .dice-dot:nth-child(6) { position: absolute; bottom: 20px; right: 20px; }


                /* Confetti styles */
                .confetti-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    overflow: hidden;
                    z-index: 100;
                }

                .confetti {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background-color: #f00; /* Default color */
                    opacity: 0;
                    transform: translateY(0) rotateZ(0);
                    animation: fall 3s ease-out forwards;
                }

                @keyframes fall {
                    0% {
                        opacity: 0;
                        transform: translateY(-100px) rotateZ(0deg);
                    }
                    20% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotateZ(720deg);
                        opacity: 0;
                    }
                }

                /* Keyframe for bounce-in effect */
                @keyframes bounce-in {
                    0% {
                        transform: scale(0.5);
                        opacity: 0;
                    }
                    70% {
                        transform: scale(1.1);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1);
                    }
                }

                .animate-bounce-in {
                    animation: bounce-in 0.8s ease-out;
                }

                /* Keyframe for fade-in effect */
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }

                /* Keyframe for fade-in-down effect */
                @keyframes fade-in-down {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in-down {
                    animation: fade-in-down 0.6s ease-out;
                }
            `}</style>
        </div>
    );
};

export default AppDados;