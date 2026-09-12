// src/constants.js
export const LANGUAGE_VERSIONS = {
  javascript: "18.15.0",
  typescript: "5.0.3",
  python: "3.10.0",
  java: "15.0.2",
  csharp: "6.12.0",
  php: "8.2.3",
  c: "10.2.0",
  cpp: "10.2.0",
  ruby: "3.0.1",
  go: "1.16.2",
  rust: "1.68.2",
  swift: "5.3.3",
  kotlin: "1.8.20",
  r: "4.1.1",
  dart: "2.19.6",
};

export const CODE_SNIPPETS = {
  javascript: `// JavaScript
function greet(name) {
  console.log("Hello, " + name + "!");
}

greet("World");`,

  typescript: `// TypeScript
type Params = {
  name: string;
};

function greet(data: Params): void {
  console.log("Hello, " + data.name + "!");
}

greet({ name: "World" });`,

  python: `# Python
def greet(name):
    print(f"Hello, {name}!")

greet("World")`,

  java: `// Java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,

  csharp: `// C#
using System;

namespace HelloWorld {
    class Program {
        static void Main(string[] args) {
            Console.WriteLine("Hello, World!");
        }
    }
}`,

  php: `<?php
// PHP
$name = "World";
echo "Hello, " . $name . "!";
?>`,
  
  c: `// C
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
  
  cpp: `// C++
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  
  ruby: `# Ruby
def greet(name)
  puts "Hello, #{name}!"
end

greet("World")`,
  
  go: `// Go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
  
  rust: `// Rust
fn main() {
    println!("Hello, World!");
}`,
  
  swift: `// Swift
import Swift

func greet(name: String) {
    print("Hello, \\(name)!")
}

greet(name: "World")`,
  
  kotlin: `// Kotlin
fun main() {
    println("Hello, World!")
}`,
  
  r: `# R
greet <- function(name) {
  cat("Hello,", name, "!")
}

greet("World")`,
  
  dart: `// Dart
void main() {
  print('Hello, World!');
}`,
};

// Language categories for grouping
export const LANGUAGE_CATEGORIES = {
  web: ["javascript", "typescript", "php"],
  general: ["python", "java", "csharp", "ruby", "go", "dart"],
  systems: ["c", "cpp", "rust"],
  mobile: ["swift", "kotlin"],
  data: ["r"],
};

// Language display names
export const LANGUAGE_NAMES = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  csharp: "C#",
  php: "PHP",
  c: "C",
  cpp: "C++",
  ruby: "Ruby",
  go: "Go",
  rust: "Rust",
  swift: "Swift",
  kotlin: "Kotlin",
  r: "R",
  dart: "Dart",
};