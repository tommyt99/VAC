#include <iostream>
using namespace std;

int main() {
	

	int balance = 1000;
	int depwith = 0;
	
	while (balance > 0) {

		cout << "Current Balance:" << balance << endl;
		cout << "Deposit or withdraw " << endl;
		cin >> depwith;

		if ((balance += depwith) < 0){
			cout << "You cannot make that deposit, you only have" << balance << "left" << endl;
		}

		//try breaking this loop 

	}
	return 0;
}
