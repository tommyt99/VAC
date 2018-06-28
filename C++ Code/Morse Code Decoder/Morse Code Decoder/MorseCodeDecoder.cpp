#include <iostream>
#include <array>
#include <vector>
#include <cmath>
#include <string>
using namespace std; 

string translator(string n, int a) {
	string alphabet = "abcdefghijklmnopqrstuvwxyz";
	string morse[] = { "*-","-***","-*-*","-**","*","**-*","--*","****",
		"**","*---","-*-","*-**","--","-*","---","*--*","--*-", "*-*","***",
		"-","**-","***-","*--","-**-","-*--","--**" };
	string translation;
	if (a == 1) {			 //When user chooses English to Morse
		int position = alphabet.find(n);
		if (position != -1)
			return morse[position];

		else
			return " ";
	}
	
	if (a==2) {				 //When user chooses Morse to English (a==2)
		if (morse->find(n) != -1) {
			int position = morse->find(n);
			return alphabet[position];
		}
		else
			return " "; 
	}

	int lowercase(string input); {
		string input;
		for (int i =0; i <input.length(); ++i)
			if (input[i] >= 65 && input[i] <= 90) {
				input[i] += 32;
			}
	}


	void english2morse(); {
	cout << "Enter the message that you would want to turn to morse code:";
	string input;
	getline(cin, input);
	lowercase(input);
	int a = 1;
	string phrase = "";
	for (int i = 0; i<input.length(); i++) {
		
			phrase += translator(input[i], a);
	}
	cout << phrase << endl;

	
	int oh;
	cin >> oh;
	
}


	void morse2english(); {
	int a = 2; 
	cout << "Enter morse code to convert to English." << endl; 
	cout << "One space between letters and two spaces between words." << endl;
	cout << "Enter morse code with each letter inside quotations:  " <<endl;
	string input; 
	getline(cin, input); 
	string array[] = {input}; 
	string phrase = ""; 
	for (int i = 0; i< array.length(); i++) {
		
			phrase += translator(array[i], a);
	}
	cout << phrase << endl;
	
	}
	



	int main(); {
	cout << "1: English to Morse." << endl;
	cout << "2: Morse to English." << endl;
	int a; 
	cin >> a;
	
	if (a == 1) {
		english2morse();
	}
	/*
	if (a == 2) {
		morse2english();
	}
	*/
	
	int oh;
	cin >> oh; 

	return 0; 
}
