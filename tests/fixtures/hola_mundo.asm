section .data
    mensaje db "Hola mundo!", 10     ; 10 es el código ASCII para salto de línea (\n)
    len equ $ - mensaje             ; Calcula la longitud de la cadena

section .text
    global _start                   ; Punto de entrada para el linker

_start:
    ; Llamada al sistema (syscall) para escribir en pantalla (sys_write = 1)
    mov rax, 1                      ; 1 = write
    mov rdi, 1                      ; 1 = stdout (salida estándar)
    mov rsi, mensaje                ; Puntero al mensaje
    mov rdx, len                    ; Longitud del mensaje
    syscall                         ; Ejecuta la interrupción del kernel

    ; Llamada al sistema para salir del programa (sys_exit = 60)
    mov rax, 60                     ; 60 = exit
    xor rdi, rdi                    ; Código de salida 0
    syscall
